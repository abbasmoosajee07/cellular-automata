use std::{fs, path::{Path, PathBuf}};
use crate::formats::{PatternConfig, Plaintext};

#[derive(Debug)]
pub struct PatternIO {
    pub name: String,
    pub format: String,
    pub path: Option<PathBuf>,

    pub file_text: String,
    pub parsed: PatternConfig,
}

impl PatternIO {
    pub fn new() -> Self {
        Self {
            name: String::new(),
            format: String::new(),
            path: None,
            file_text: String::new(),
            parsed: PatternConfig::default(),
        }
    }

    pub fn read_file<P: AsRef<Path>>(
        &mut self, path: P,
    ) -> Result<(), std::io::Error> {
        let path = path.as_ref();

        let (name, format) = Self::parse_filename(path);
        self.name = name;
        self.format = format;
        // self.path = path.parent().map(|p| p.to_path_buf());

        self.file_text = fs::read_to_string(path)?;

        match self.format.as_str() {
            "cells" | "txt" => {
                self.parsed = Plaintext::parse(&self.file_text);
            }
            _ => {
                // future: RLE, etc.
                self.parsed = PatternConfig::default();
            }
        }
        Ok(())
    }

    pub fn read_pattern(&mut self, pattern_data: String) {
        match self.format.as_str() {
            "cells" | "txt" => {
                self.parsed = Plaintext::parse(&pattern_data);
            }
            _ => {
                // future: RLE, etc.
                // self.parsed = PatternConfig::default();
                self.parsed = Plaintext::parse(&pattern_data);
            }
        }
    }

    pub fn save_file(&self) -> Result<(), std::io::Error> {
        let filename = if self.format.is_empty() {
            self.name.clone()
        } else {
            format!("{}.{}", self.name, self.format)
        };

        let path = match &self.path {
            Some(dir) => dir.join(filename),
            None => PathBuf::from(filename),
        };
        let write_text = Plaintext::write(&self.parsed);
        println!("{}", write_text);

        fs::write(&path, write_text)?;
        Ok(())
    }

    fn parse_filename(path: &Path) -> (String, String) {
        let name = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_string();

        let format = path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_string();

        (name, format)
    }
}
