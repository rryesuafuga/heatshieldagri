//! Menu rendering utilities

use crate::i18n::messages::get_message;

/// Maximum characters per line in USSD display
pub const MAX_LINE_LENGTH: usize = 30;

/// Maximum total message length
pub const MAX_MESSAGE_LENGTH: usize = 182;

/// Render a menu with proper formatting
pub fn render_menu(title: &str, options: &[(&str, &str)], footer: Option<&str>) -> String {
    let mut output = format!("CON {}\n", truncate(title, MAX_LINE_LENGTH));
    output.push_str(&"=".repeat(title.len().min(MAX_LINE_LENGTH)));
    output.push_str("\n\n");

    for (key, label) in options {
        output.push_str(&format!("{}. {}\n", key, truncate(label, MAX_LINE_LENGTH - 3)));
    }

    if let Some(footer_text) = footer {
        output.push('\n');
        output.push_str(footer_text);
    }

    truncate_message(&output)
}

/// Render an end screen (session termination)
pub fn render_end_screen(title: &str, content: &str) -> String {
    let mut output = format!("END {}\n", truncate(title, MAX_LINE_LENGTH));
    output.push_str(&"=".repeat(title.len().min(MAX_LINE_LENGTH)));
    output.push_str("\n\n");
    output.push_str(content);

    truncate_message(&output)
}

/// Render a risk indicator with visual elements
pub fn render_risk_indicator(wbgt: f64, risk_level: &str, lang: &str) -> String {
    let bar = match risk_level {
        "Low" => "[====      ]",
        "Moderate" => "[======    ]",
        "High" => "[========  ]",
        "Very High" => "[========= ]",
        "Extreme" => "[==========]",
        _ => "[          ]",
    };

    format!(
        "{:.1}°C WBGT\n\
        {}\n\
        Risk: {}",
        wbgt, bar, risk_level
    )
}

/// Truncate a string to fit the display
pub fn truncate(s: &str, max_len: usize) -> &str {
    if s.len() <= max_len {
        s
    } else {
        &s[..max_len.saturating_sub(3)]
    }
}

/// Truncate message to USSD maximum length
pub fn truncate_message(s: &str) -> String {
    if s.len() <= MAX_MESSAGE_LENGTH {
        s.to_string()
    } else {
        format!("{}...", &s[..MAX_MESSAGE_LENGTH - 3])
    }
}

/// Word wrap text to fit display width
pub fn word_wrap(text: &str, width: usize) -> String {
    let words: Vec<&str> = text.split_whitespace().collect();
    let mut lines = Vec::new();
    let mut current_line = String::new();

    for word in words {
        if current_line.is_empty() {
            current_line = word.to_string();
        } else if current_line.len() + 1 + word.len() <= width {
            current_line.push(' ');
            current_line.push_str(word);
        } else {
            lines.push(current_line);
            current_line = word.to_string();
        }
    }

    if !current_line.is_empty() {
        lines.push(current_line);
    }

    lines.join("\n")
}

/// Format a temperature value
pub fn format_temperature(temp: f64, unit: &str) -> String {
    match unit {
        "F" => format!("{:.1}°F", temp * 9.0 / 5.0 + 32.0),
        _ => format!("{:.1}°C", temp),
    }
}

/// Format a time range
pub fn format_time_range(start: u8, end: u8) -> String {
    format!("{:02}:00 - {:02}:00", start, end)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_render_menu() {
        let menu = render_menu(
            "Test Menu",
            &[("1", "Option One"), ("2", "Option Two")],
            Some("0. Back"),
        );
        assert!(menu.starts_with("CON"));
        assert!(menu.contains("Option One"));
    }

    #[test]
    fn test_truncate() {
        assert_eq!(truncate("Hello", 10), "Hello");
        assert_eq!(truncate("Hello World", 8), "Hello");
    }

    #[test]
    fn test_word_wrap() {
        let text = "This is a long sentence that should be wrapped.";
        let wrapped = word_wrap(text, 20);
        assert!(wrapped.contains('\n'));
    }
}
