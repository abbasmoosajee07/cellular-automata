use std::{fs, path::{Path, PathBuf}};
use crate::formats::{PatternConfig, Plaintext};

#[derive(Debug)]
pub struct PatternIO;

impl PatternIO {

    pub fn read_file<P: AsRef<Path>>(
        path: P,
    ) -> Result<PatternConfig, std::io::Error> {
        let path_str = path.as_ref().to_string_lossy().to_string();
        let path = path.as_ref();

        let file_text = fs::read_to_string(path)?;

        Ok(Self::read_pattern(&path_str, &file_text))
    }

    pub fn read_pattern(
        pattern_props: &str, pattern_data: &str,
    ) -> PatternConfig {
        let path = pattern_props.as_ref();

        let (name, format) = Self::parse_filename(path);

        let mut cfg = Self::match_format(&format, pattern_data);
        cfg.name = name;
        cfg.format = format;
        cfg
    }

    pub fn match_format(format: &str, pattern_data: &str) -> PatternConfig {
        match format {
            "cells" | "txt" => Plaintext::parse(pattern_data),
            _ => PatternConfig::default(),
        }
    }

    pub fn save_file(config: PatternConfig) -> Result<(), std::io::Error> {
        let filename = if config.format.is_empty() {
            config.name.clone()
        } else {
            format!("{}.{}", config.name, config.format)
        };

        let path = PathBuf::from(filename);

        let write_text = Plaintext::write(&config);
        println!("{}", write_text);

        fs::write(&path, write_text)?;
        Ok(())
    }

    pub fn write_text(config: PatternConfig) -> String {
        Plaintext::write(&config)
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
