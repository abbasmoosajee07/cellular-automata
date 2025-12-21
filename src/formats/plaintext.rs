
use crate::formats::PatternConfig;

pub struct Plaintext;

impl Plaintext {
    pub fn parse(file_data: &str) -> PatternConfig {
        let mut cfg = PatternConfig::default();

        let mut rows = Vec::new();

        for line in file_data.lines() {
            let line = line.trim();

            if line.starts_with('!') {
                cfg.comments.push(line.to_string());
            } else if matches!(line.chars().next(), Some('.' | 'O')) {
                rows.push(line.to_string());
            }
        }

        let height = rows.len() as i32;
        let width = rows.first().map(|r| r.len()).unwrap_or(0) as i32;

        cfg.grid_size = [width, height, 1];
        cfg.top_left = [-width/2, height/2, 1];
        cfg.cells = rows.clone();

        for (y, row) in rows.iter().enumerate() {
            for (x, ch) in row.chars().enumerate() {
                if ch == 'O' {
                    cfg.alive.push((x as i32, y as i32, 0, 1 as u32));
                    println!("{},{}",x, y)
                }
            }
        }
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

        // Create a 2D grid of dead cells
        let mut grid = vec![vec!['.'; width]; height];

        // Mark alive cells
        for (x, y, _, _) in &config.alive {
            let x = *x as usize;
            let y = *y as usize;
            if y < height && x < width {
                grid[y][x] = 'O';
            }
        }

        // Convert grid to strings
        for row in grid {
            let row_str: String = row.iter().collect();
            file_text.push_str(&row_str);
            file_text.push('\n');
        }
        file_text
    }

}

