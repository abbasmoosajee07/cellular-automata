
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
        let width = rows
            .iter()
            .map(|r| r.len())
            .max()
            .unwrap_or(0) as i32;

        cfg.grid_size = [width as usize, height as usize, 1 as usize];
        cfg.top_left = [-width/2, -height/2, 0];

        for (x, row) in rows.iter().enumerate() {
            for (y, ch) in row.chars().enumerate() {
                if ch == 'O' {
                    cfg.alive.push((y as i32, x as i32, 0, 1 as u32));
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
        for (y, x, _, _) in &config.alive {
            let x = *x as usize;
            let y = *y as usize;
            if x < height && y < width {
                grid[x][y] = 'O';
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

