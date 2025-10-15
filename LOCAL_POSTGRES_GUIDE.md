# 로컬 PostgreSQL 개발 환경 가이드

Railway 배포 환경과 동일하게 로컬에서도 PostgreSQL을 사용하는 방법입니다.

## 🎯 장점

- ✅ **배포 환경과 동일**: Railway와 같은 PostgreSQL 사용
- ✅ **DB 차이 없음**: SQLite vs PostgreSQL 차이로 인한 버그 방지
- ✅ **쉬운 설정**: Docker Compose로 간편하게 시작
- ✅ **데이터 마이그레이션**: 기존 SQLite 데이터 자동 이전

## 📋 필요 사항

1. **Docker Desktop** 설치
   - Mac: https://www.docker.com/products/docker-desktop
   - 설치 후 Docker Desktop 실행 필요

## 🚀 시작하기

### 방법 1: 자동 스크립트 (추천)

```bash
# 프로젝트 루트에서
./start_local_postgres.sh
```

이 스크립트가 자동으로:
1. PostgreSQL 컨테이너 시작
2. 기존 SQLite 데이터 마이그레이션 (선택)
3. 테이블 생성

### 방법 2: 수동 설정

#### 1. PostgreSQL 시작

```bash
# PostgreSQL 컨테이너 시작
docker-compose up -d

# 상태 확인
docker ps
```

#### 2. 환경 변수 설정

```bash
cd backend
export DATABASE_URL=postgresql://crossfit_user:crossfit_password@localhost:5432/crossfit
```

#### 3. 데이터 마이그레이션 (선택)

기존 SQLite 데이터가 있다면:

```bash
source venv/bin/activate
python migrate_to_postgres.py
```

새로 시작한다면:

```bash
source venv/bin/activate
python -c "from app import app, db; app.app_context().push(); db.create_all()"
```

#### 4. 백엔드 실행

```bash
python app.py
```

## 🔧 설정 파일

### `docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: crossfit
      POSTGRES_USER: crossfit_user
      POSTGRES_PASSWORD: crossfit_password
    ports:
      - "5432:5432"
```

### `backend/.env.local`

```bash
DATABASE_URL=postgresql://crossfit_user:crossfit_password@localhost:5432/crossfit
FLASK_ENV=development
SECRET_KEY=local-development-secret-key
PORT=5001
```

## 📊 데이터베이스 접속 정보

로컬 PostgreSQL에 직접 접속하려면:

```
Host:     localhost
Port:     5432
Database: crossfit
User:     crossfit_user
Password: crossfit_password
```

**추천 도구:**
- [pgAdmin](https://www.pgadmin.org/)
- [DBeaver](https://dbeaver.io/)
- [Postico](https://eggerapps.at/postico/) (Mac only)

## 🎮 주요 명령어

### PostgreSQL 관리

```bash
# 시작
docker-compose up -d

# 중지
docker-compose stop

# 완전 종료 (컨테이너 삭제)
docker-compose down

# 데이터까지 삭제 (주의!)
docker-compose down -v

# 로그 확인
docker-compose logs -f postgres

# PostgreSQL CLI 접속
docker exec -it crossfit-postgres psql -U crossfit_user -d crossfit
```

### 백엔드 실행

```bash
cd backend
source venv/bin/activate

# PostgreSQL 사용
export DATABASE_URL=postgresql://crossfit_user:crossfit_password@localhost:5432/crossfit
python app.py

# 또는 .env.local 사용
source .env.local
python app.py
```

### SQLite로 돌아가기

PostgreSQL 대신 SQLite를 사용하려면:

```bash
# DATABASE_URL 환경 변수 제거
unset DATABASE_URL

# 백엔드 실행 (자동으로 SQLite 사용)
python app.py
```

## 🔄 데이터 마이그레이션

### SQLite → PostgreSQL

```bash
cd backend
source venv/bin/activate
export DATABASE_URL=postgresql://crossfit_user:crossfit_password@localhost:5432/crossfit
python migrate_to_postgres.py
```

마이그레이션되는 데이터:
- ✅ Users (사용자)
- ✅ Exercises (운동 종류)
- ✅ Programs (WOD 프로그램)
- ✅ ProgramExercises (프로그램-운동 관계)
- ✅ WorkoutPatterns (WOD 패턴)
- ✅ ExerciseSets (운동 세트)
- ✅ ProgramParticipants (참여자)
- ✅ WorkoutRecords (운동 기록)
- ✅ Notifications (알림)

## 🐛 문제 해결

### 포트 5432가 이미 사용 중

다른 PostgreSQL이 실행 중일 수 있습니다:

```bash
# Mac에서 PostgreSQL 확인
brew services list

# 중지
brew services stop postgresql

# 또는 docker-compose.yml에서 포트 변경
ports:
  - "5433:5432"  # 5433으로 변경
```

그리고 DATABASE_URL도 업데이트:
```bash
export DATABASE_URL=postgresql://crossfit_user:crossfit_password@localhost:5433/crossfit
```

### 컨테이너가 시작되지 않음

```bash
# Docker Desktop이 실행 중인지 확인
docker ps

# 로그 확인
docker-compose logs postgres

# 완전히 삭제하고 재시작
docker-compose down -v
docker-compose up -d
```

### 마이그레이션 실패

```bash
# psycopg2 설치 확인
pip install psycopg2-binary

# DATABASE_URL 확인
echo $DATABASE_URL

# PostgreSQL 연결 테스트
python -c "from app import app, db; app.app_context().push(); print(db.engine.url)"
```

## 💡 팁

1. **개발 시**: PostgreSQL 사용 (배포 환경과 동일)
2. **빠른 테스트**: SQLite 사용 (DATABASE_URL 제거)
3. **데이터 백업**: `docker exec crossfit-postgres pg_dump...`
4. **성능 비교**: 두 DB로 테스트 가능

## 🆚 SQLite vs PostgreSQL

| 기능 | SQLite | PostgreSQL |
|------|--------|-----------|
| 설정 | ✅ 간단 | ⚠️ Docker 필요 |
| 성능 | 🐢 느림 (대용량) | 🚀 빠름 |
| 동시 접속 | ⚠️ 제한적 | ✅ 우수 |
| 배포 환경 | ❌ 다름 | ✅ 동일 |
| 데이터 타입 | ⚠️ 제한적 | ✅ 풍부 |

## 📚 참고 자료

- [Docker Compose 문서](https://docs.docker.com/compose/)
- [PostgreSQL 문서](https://www.postgresql.org/docs/)
- [SQLAlchemy PostgreSQL](https://docs.sqlalchemy.org/en/20/dialects/postgresql.html)

