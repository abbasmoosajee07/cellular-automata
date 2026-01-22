use std::{
    fs,
    path::{Path, PathBuf},
};

use crate::formats::{PatternConfig, Plaintext, RunLengthEncoder};

#[derive(Debug)]
pub struct PatternIO;

/// Holds the read/write behavior for a file format
struct FormatHandler {
    parse: fn(&str) -> PatternConfig,
    write: fn(&PatternConfig) -> String,
}

impl PatternIO {
    /* ------------------ PUBLIC API ------------------ */

    pub fn read_file<P: AsRef<Path>>(
        path: P,
    ) -> Result<PatternConfig, std::io::Error> {
        let path_ref = path.as_ref();
        let path_str = path_ref.to_string_lossy().to_string();

        let file_text = fs::read_to_string(path_ref)?;
        Ok(Self::read_pattern(&path_str, &file_text))
    }

    pub fn read_pattern(
        pattern_props: &str,
        pattern_data: &str,
    ) -> PatternConfig {
        let path = Path::new(pattern_props);
        let (name, format) = Self::parse_filename(path);

        // 🔑 Select format ONCE
        let handler = Self::select_format(&format);

        let mut cfg = (handler.parse)(pattern_data);
        cfg.name = name;
        cfg.format = format;
        cfg
    }

    pub fn save_file(config: PatternConfig) -> Result<(), std::io::Error> {
        let handler = Self::select_format(&config.format);

        let filename = if config.format.is_empty() {
            config.name.clone()
        } else {
            format!("{}.{}", config.name, config.format)
        };

        let path = PathBuf::from(filename);
        let output = (handler.write)(&config);

        fs::write(path, output)?;
        Ok(())
    }

    pub fn write_text(config: PatternConfig) -> String {
        let handler = Self::select_format(&config.format);
        (handler.write)(&config)
    }

    /* ------------------ INTERNAL ------------------ */

    fn select_format(format: &str) -> FormatHandler {
        match format {
            "cells" | "txt" => FormatHandler {
                parse: Plaintext::parse,
                write: Plaintext::write,
            },
            "rle" | "RLE" => FormatHandler {
                parse: RunLengthEncoder::parse,
                write: RunLengthEncoder::write,
            },
            _ => FormatHandler {
                parse: |_| PatternConfig::default(),
                write: |_| String::new(),
            },
        }
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
