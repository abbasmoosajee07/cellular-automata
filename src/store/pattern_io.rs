use std::{fs, path::{Path, PathBuf}};
#[derive(Debug, Clone, Default)]
pub struct ParsedPattern {
    pub comments: Vec<String>,
    pub cells: Vec<String>,
    pub grid_size: [i32; 3],
    pub rule: String,
    pub top_left: [i32; 3],
}

pub struct PatternIO {
    pub name: String,
    pub format: String,
    pub path: Option<String>,

    pub file_text: String,
    pub parsed: ParsedPattern,

}

impl PatternIO {
    pub fn new() -> Self {
        Self {
            name: String::new(),
            format: String::new(),
            path: None,

            file_text: String::new(),
            parsed: ParsedPattern::default(),
        }
    }

    pub fn parse_filename(&self, path: &Path) -> (String, String) {
        let stem = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_string();

        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_string();

        (stem, ext)
    }

    /// Read a pattern file from a given path
    pub fn read_from_path<P: AsRef<Path>>(
        &mut self,
        path: P,
    ) -> Result<(), std::io::Error> {
        let path = path.as_ref();

        let (filename, ext) = self.parse_filename(path);
        self.name = filename;
        self.format = ext;
        // self.path = Some(path.to_string_lossy().into_owned());
        self.file_text = fs::read_to_string(path)?;
        let (_comments, _cells) = self.parse_plaintext(&self.file_text);
        self.file_text += "\nTest Pattern IO";

        println!(
            "Reading File: {} Ext:{} from {}",
            self.name,
            self.format,
            path.display()
        );

        Ok(())
    }

    pub fn save_to_file(&mut self) -> Result<(), std::io::Error> {
        let filename = if self.format.is_empty() {
            self.name.clone()
        } else {
            format!("{}.{}", self.name, self.format)
        };

        let path = match &self.path {
            Some(existing) => {
                let mut p = PathBuf::from(existing);
                p.set_file_name(filename);
                p
            }
            None => PathBuf::from(filename),
        };

        fs::write(&path, &self.file_text)?;

        println!("Saved pattern to {}", path.display());
        Ok(())
    }


    pub fn parse_plaintext(
        &self,
        file_data: &str,
    ) -> (Vec<String>, Vec<String>) {
        let mut comments = Vec::new();
        let mut cells = Vec::new();

        for line in file_data.lines() {
            let line = line.trim();

            if line.starts_with('!') {
                comments.push(line.to_string());
            } else if matches!(line.chars().next(), Some('.' | 'O')) {
                cells.push(line.to_string());
            }
        }

        // Safely compute grid size
        // let height = cells.len() as i32;
        // let width = cells.first().map(|r| r.len()).unwrap_or(0) as i32;

        // self.grid_size = [width, height, 0];

        // Extract active cells
        let mut active_cells = Vec::new();
        for (row, row_data) in cells.iter().enumerate() {
            for (col, cell) in row_data.chars().enumerate() {
                if cell == 'O' {
                    active_cells.push((row, col));
                }
            }
        }

        // Debug output
        #[cfg(debug_assertions)]
        {
            for (i, (row, col)) in active_cells.iter().enumerate() {
                println!("#{i}: ({row}, {col})");
            }
        }

        (comments, cells)
    }

}
