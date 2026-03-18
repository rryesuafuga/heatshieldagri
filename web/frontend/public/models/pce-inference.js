/**
 * HeatShield Agri — PCE Inference (Zero Dependencies)
 * Sparse Legendre polynomial evaluator.
 * Replaces onnxruntime-web (~3 MB) with pure JS.
 */
class PCEModel {
  constructor(json) {
    this.dim = json.dim;
    this.normParams = json.norm_params;
    this.coefficients = json.coefficients;
    this.multiIndices = json.multi_indices;
    this.maxDeg = new Array(this.dim).fill(0);
    for (const mi of this.multiIndices) {
      for (let i = 0; i < this.dim; i++) {
        if (mi[i] > this.maxDeg[i]) this.maxDeg[i] = mi[i];
      }
    }
  }
  _legendreAll(xi, maxK) {
    const P = new Float64Array(maxK + 1);
    P[0] = 1.0;
    if (maxK >= 1) P[1] = xi;
    for (let k = 1; k < maxK; k++) {
      P[k+1] = ((2*k+1)*xi*P[k] - k*P[k-1]) / (k+1);
    }
    for (let k = 0; k <= maxK; k++) {
      P[k] *= Math.sqrt((2*k+1)/2);
    }
    return P;
  }
  predict(inputs) {
    const d = this.dim, basis = new Array(d);
    for (let i = 0; i < d; i++) {
      const {lo, hi} = this.normParams[i];
      const xi = Math.max(-1, Math.min(1, 2*(inputs[i]-lo)/(hi-lo)-1));
      basis[i] = this._legendreAll(xi, this.maxDeg[i]);
    }
    let result = 0;
    for (let k = 0; k < this.coefficients.length; k++) {
      let term = this.coefficients[k];
      const mi = this.multiIndices[k];
      for (let i = 0; i < d; i++) term *= basis[i][mi[i]];
      result += term;
    }
    return result;
  }
}
// Usage:
// const model = new PCEModel(await fetch('/models/temperature_pce.json').then(r=>r.json()));
// const pred = model.predict(featureVector);