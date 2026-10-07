# Fallback Procfile (Railpack may detect it). Prefer railway.toml startCommand.
# Portable across Root=/backend and repo root.
web: bash -c 'if [ -f start.sh ]; then exec bash start.sh; else exec bash backend/start.sh; fi'
