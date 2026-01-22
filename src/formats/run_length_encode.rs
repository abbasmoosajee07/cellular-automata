use crate::formats::PatternConfig;

pub struct RunLengthEncoder;

impl RunLengthEncoder {
    pub fn parse(file_data: &str) -> PatternConfig {
        let mut cfg = PatternConfig::default();

        let mut cell_data = Vec::new();

        // 🔑 store header values here
        let mut x: Option<i32> = None;
        let mut y: Option<i32> = None;
        let mut rule: Option<String> = None;

        for line in file_data.lines() {
            let line = line.trim();

            if line.starts_with('#') {
                cfg.comments.push(line.to_string());
            } else if matches!(line.chars().next(), Some('x' | 'y')) {
                // parse: x = 36, y = 9, rule = B3/S23
                for part in line.split(',').map(str::trim) {
                    let mut iter = part.splitn(2, '=').map(str::trim);
                    let key = iter.next().unwrap();
                    let value = iter.next().unwrap();

                    match key {
                        "x" => x = Some(value.parse().unwrap()),
                        "y" => y = Some(value.parse().unwrap()),
                        "rule" => rule = Some(value.to_string()),
                        _ => {}
                    }
                }

            } else if matches!(line.chars().next(), Some('$' | '!' | 'b' | 'o')) {
                cell_data.push(line.to_string());
            }
        }

        let width = x.unwrap_or(0);
        let height = y.unwrap_or(0);

        cfg.grid_size = [width as usize, height as usize, 1];
        cfg.top_left = [-width/2, -height/2, 0];
        cfg.rule = rule.unwrap_or_default();

        let joined = cell_data.join("");
        let rows_data: Vec<&str> = joined.split("$").collect();

        println!("{:?}", rows_data);
        cfg
    }

    pub fn write(config: &PatternConfig) -> String {
        let mut file_text = String::new();

        // Write comments first
        for comment in &config.comments {
            file_text.push_str(comment);
            file_text.push('\n');
        }

        let width = config.grid_size[0] as usize;
        let height = config.grid_size[1] as usize;
        let grid_info = format!("x = {}, y = {}, rule = {}", width, height, &config.rule);
        file_text.push_str(&grid_info);
        file_text
    }

}
