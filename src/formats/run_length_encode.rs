use crate::formats::PatternConfig;
use std::collections::HashSet;

pub struct RunLengthEncoder;

impl RunLengthEncoder {
    pub fn parse(file_data: &str) -> PatternConfig {
        let mut cfg = PatternConfig::default();

        let mut body = String::new();

        let mut width: Option<i32> = None;
        let mut height: Option<i32> = None;
        let mut rule: Option<String> = None;

        /* ------------------ READ FILE ------------------ */
        for line in file_data.lines().map(str::trim) {
            if line.is_empty() {
                continue;
            }

            if line.starts_with('#') {
                cfg.comments.push(line.to_string());
                continue;
            }

            if line.starts_with('x') {
                // x = width, y = height, rule = rule
                for part in line.split(',').map(str::trim) {
                    if let Some((key, value)) = part.split_once('=') {
                        match key.trim() {
                            "x" => width = value.trim().parse().ok(),
                            "y" => height = value.trim().parse().ok(),
                            "rule" => rule = Some(value.trim().to_string()),
                            _ => {}
                        }
                    }
                }
                continue;
            }

            // everything else is RLE body
            body.push_str(line);
        }

        /* ------------------ HEADER ------------------ */
        let width = width.unwrap_or(0);
        let height = height.unwrap_or(0);

        cfg.grid_size = [width as usize, height as usize, 1];
        cfg.top_left = [-width / 2, -height / 2, 0];
        cfg.rule = rule.unwrap_or_default();

        /* ------------------ DECODE RLE ------------------ */
        for (row_no, row) in body.split('$').enumerate() {
            let mut col_no: usize = 0;
            let mut run: usize = 0;

            for ch in row.chars() {
                match ch {
                    '0'..='9' => {
                        run = run * 10 + (ch as usize - '0' as usize);
                    }

                    'b' | 'o' => {
                        let count = if run == 0 { 1 } else { run };

                        if ch == 'o' {
                            for c in 0..count {
                                cfg.alive.push((
                                    (col_no + c) as i32, row_no as i32, 0, 1,
                                ));
                            }
                        }

                        col_no += count;
                        run = 0;
                    }

                    '!' => break,
                    _ => {}
                }
            }
        }

        cfg
    }

    pub fn write(config: &PatternConfig) -> String {
        let mut file_text = String::new();

        // Comments
        for comment in &config.comments {
            file_text.push_str(comment);
            file_text.push('\n');
        }

        let width  = config.grid_size[0];
        let height = config.grid_size[1];

        let header = format!("x = {}, y = {}, rule = {}\n",
            width, height, config.rule
        );

        file_text.push_str(&header);
        file_text.push_str(&encode_rle_body(config));

        file_text
    }

}

pub fn encode_rle_body(config: &PatternConfig) -> String {
    let width  = config.grid_size[0] as i32;
    let height = config.grid_size[1] as i32;

    // Fast lookup for alive cells
    let alive: HashSet<(i32, i32)> =
        config.alive.iter().map(|(c, r, _, _)| (*c, *r)).collect();

    let mut out = String::new();

    for row in 0..height {
        let mut run_count = 0;
        let mut run_char: Option<char> = None;

        for col in 0..width {
            let ch = if alive.contains(&(col, row)) { 'o' } else { 'b' };

            match run_char {
                Some(rc) if rc == ch => {
                    run_count += 1;
                }
                Some(rc) => {
                    // Flush previous run
                    if run_count > 1 {
                        out.push_str(&run_count.to_string());
                    }
                    out.push(rc);
                    run_char = Some(ch);
                    run_count = 1;
                }
                None => {
                    run_char = Some(ch);
                    run_count = 1;
                }
            }
        }

        // Flush last run in row
        if let Some(rc) = run_char {
            if run_count > 1 {
                out.push_str(&run_count.to_string());
            }
            out.push(rc);
        }

        // End-of-row
        out.push('$');
    }

    // End-of-pattern
    out.push('!');

    out
}

