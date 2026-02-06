package config

import "github.com/ilyakaznacheev/cleanenv"

// Config holds app configuration loaded from env.
type Config struct {
	AppPort       string `env:"APP_PORT" env-default:"8080"`
	DBDSN         string `env:"DB_DSN" env-required:"true"`
	CORSOrigins   string `env:"CORS_ORIGINS" env-default:"http://localhost:5173"`
	LogLevel      string `env:"LOG_LEVEL" env-default:"info"`
	WSMaxBinBytes int64  `env:"WS_MAX_BIN_BYTES" env-default:"1048576"`
	WSMaxTextBytes int64 `env:"WS_MAX_TEXT_BYTES" env-default:"65536"`
}

func Load() (*Config, error) {
	var cfg Config
	if err := cleanenv.ReadEnv(&cfg); err != nil {
		return nil, err
	}
	return &cfg, nil
}
