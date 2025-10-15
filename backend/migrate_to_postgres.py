#!/usr/bin/env python3
"""
SQLite에서 PostgreSQL로 데이터 마이그레이션

사용법:
1. Docker PostgreSQL 실행: docker-compose up -d
2. 환경 변수 설정: export DATABASE_URL=postgresql://crossfit_user:crossfit_password@localhost:5432/crossfit
3. 스크립트 실행: python migrate_to_postgres.py
"""

import os
import sys
import sqlite3
from datetime import datetime

# Flask 앱 import
from app import app, db
from models.user import Users
from models.program import Programs, ProgramParticipants
from models.exercise import Exercises, ProgramExercises, WorkoutPatterns, ExerciseSets
from models.workout_record import WorkoutRecords
from models.notification import Notifications

def migrate_data():
    """SQLite 데이터를 PostgreSQL로 마이그레이션"""
    
    # SQLite 연결
    sqlite_path = os.path.join(os.path.dirname(__file__), 'instance', 'crossfit.db')
    if not os.path.exists(sqlite_path):
        print(f"❌ SQLite DB를 찾을 수 없습니다: {sqlite_path}")
        return False
    
    print(f"📂 SQLite DB: {sqlite_path}")
    sqlite_conn = sqlite3.connect(sqlite_path)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cursor = sqlite_conn.cursor()
    
    with app.app_context():
        print("\n=== PostgreSQL 테이블 생성 ===")
        db.create_all()
        print("✅ 테이블 생성 완료")
        
        # 1. Users 마이그레이션
        print("\n=== Users 마이그레이션 ===")
        sqlite_cursor.execute("SELECT * FROM users")
        users = sqlite_cursor.fetchall()
        
        # 직접 SQL로 안전하게 insert
        from sqlalchemy import text
        for row in users:
            try:
                # password_hash 컬럼명 처리
                password_value = row['password_hash'] if 'password_hash' in row.keys() else (row['password'] if 'password' in row.keys() else '')
                created_at = row['created_at'] if row['created_at'] else None
                
                # PostgreSQL에 직접 insert (role, is_active, last_login_at은 기본값 사용)
                db.session.execute(
                    text("""
                        INSERT INTO users (id, email, password_hash, name, created_at, role, is_active)
                        VALUES (:id, :email, :password_hash, :name, :created_at, 'user', TRUE)
                        ON CONFLICT (id) DO UPDATE SET
                            email = EXCLUDED.email,
                            password_hash = EXCLUDED.password_hash,
                            name = EXCLUDED.name
                    """),
                    {
                        "id": row['id'],
                        "email": row['email'],
                        "password_hash": password_value,
                        "name": row['name'],
                        "created_at": created_at
                    }
                )
            except Exception as e:
                print(f"  ⚠️  User {row['id']} 마이그레이션 실패: {str(e)[:100]}")
        
        db.session.commit()
        print(f"✅ Users: {len(users)}개")
        
        # 2. ExerciseCategories 마이그레이션 (Exercises보다 먼저!)
        print("\n=== ExerciseCategories 마이그레이션 ===")
        try:
            sqlite_cursor.execute("SELECT * FROM exercise_categories")
            categories = sqlite_cursor.fetchall()
            
            for row in categories:
                try:
                    db.session.execute(
                        text("""
                            INSERT INTO exercise_categories (id, name, description, is_active, created_at)
                            VALUES (:id, :name, :description, :is_active, :created_at)
                            ON CONFLICT (id) DO UPDATE SET
                                name = EXCLUDED.name,
                                description = EXCLUDED.description
                        """),
                        {
                            "id": row['id'],
                            "name": row['name'],
                            "description": row['description'],
                            "is_active": bool(row['is_active']) if 'is_active' in row.keys() else True,
                            "created_at": row['created_at'] if 'created_at' in row.keys() else None
                        }
                    )
                except Exception as e:
                    print(f"  ⚠️  Category {row['id']} 실패: {str(e)[:80]}")
            
            db.session.commit()
            print(f"✅ ExerciseCategories: {len(categories)}개")
        except sqlite3.OperationalError as e:
            print(f"⚠️  ExerciseCategories 테이블 없음 (스킵)")
        
        # 3. Exercises 마이그레이션
        print("\n=== Exercises 마이그레이션 ===")
        sqlite_cursor.execute("SELECT * FROM exercises")
        exercises = sqlite_cursor.fetchall()
        
        for row in exercises:
            try:
                db.session.execute(
                    text("""
                        INSERT INTO exercises (id, category_id, name, description, is_active, created_at)
                        VALUES (:id, :category_id, :name, :description, :is_active, :created_at)
                        ON CONFLICT (id) DO UPDATE SET
                            name = EXCLUDED.name,
                            description = EXCLUDED.description,
                            is_active = EXCLUDED.is_active
                    """),
                    {
                        "id": row['id'],
                        "category_id": row['category_id'] if 'category_id' in row.keys() else None,
                        "name": row['name'],
                        "description": row['description'],
                        "is_active": bool(row['is_active']) if 'is_active' in row.keys() else True,
                        "created_at": row['created_at'] if 'created_at' in row.keys() else None
                    }
                )
            except Exception as e:
                row_id = row['id'] if 'id' in row.keys() else '?'
                print(f"  ⚠️  Exercise {row_id} 실패: {str(e)[:80]}")
        
        db.session.commit()
        print(f"✅ Exercises: {len(exercises)}개")
        
        # 3. Programs 마이그레이션
        print("\n=== Programs 마이그레이션 ===")
        sqlite_cursor.execute("SELECT * FROM programs")
        programs = sqlite_cursor.fetchall()
        
        for row in programs:
            try:
                db.session.execute(
                    text("""
                        INSERT INTO programs (id, creator_id, title, description, workout_type, 
                                             target_value, difficulty, max_participants, is_open, 
                                             created_at, expires_at)
                        VALUES (:id, :creator_id, :title, :description, :workout_type,
                                :target_value, :difficulty, :max_participants, :is_open,
                                :created_at, :expires_at)
                        ON CONFLICT (id) DO UPDATE SET
                            title = EXCLUDED.title,
                            description = EXCLUDED.description,
                            is_open = EXCLUDED.is_open,
                            expires_at = EXCLUDED.expires_at
                    """),
                    {
                        "id": row['id'],
                        "creator_id": row['creator_id'],
                        "title": row['title'],
                        "description": row['description'],
                        "workout_type": row['workout_type'],
                        "target_value": row['target_value'],
                        "difficulty": row['difficulty'],
                        "max_participants": row['max_participants'],
                        "is_open": bool(row['is_open']),
                        "created_at": row['created_at'],
                        "expires_at": row['expires_at']
                    }
                )
            except Exception as e:
                print(f"  ⚠️  Program {row['id']} 실패: {str(e)[:100]}")
        
        db.session.commit()
        print(f"✅ Programs: {len(programs)}개")
        
        # 4. ProgramExercises 마이그레이션
        print("\n=== ProgramExercises 마이그레이션 ===")
        sqlite_cursor.execute("SELECT * FROM program_exercises")
        program_exercises = sqlite_cursor.fetchall()
        
        for row in program_exercises:
            try:
                db.session.execute(
                    text("""
                        INSERT INTO program_exercises (id, program_id, exercise_id, target_value, order_index)
                        VALUES (:id, :program_id, :exercise_id, :target_value, :order_index)
                        ON CONFLICT (id) DO UPDATE SET
                            target_value = EXCLUDED.target_value,
                            order_index = EXCLUDED.order_index
                    """),
                    {
                        "id": row['id'],
                        "program_id": row['program_id'],
                        "exercise_id": row['exercise_id'],
                        "target_value": row['target_value'],
                        "order_index": row['order_index']
                    }
                )
            except Exception as e:
                print(f"  ⚠️  ProgramExercise {row['id']} 실패: {str(e)[:80]}")
        
        db.session.commit()
        print(f"✅ ProgramExercises: {len(program_exercises)}개")
        
        # 5. WorkoutPatterns 마이그레이션
        print("\n=== WorkoutPatterns 마이그레이션 ===")
        try:
            sqlite_cursor.execute("SELECT * FROM workout_patterns")
            patterns = sqlite_cursor.fetchall()
            
            for row in patterns:
                try:
                    db.session.execute(
                        text("""
                            INSERT INTO workout_patterns (id, program_id, pattern_type, total_rounds, 
                                                         time_cap_per_round, description)
                            VALUES (:id, :program_id, :pattern_type, :total_rounds,
                                    :time_cap_per_round, :description)
                            ON CONFLICT (id) DO UPDATE SET
                                pattern_type = EXCLUDED.pattern_type,
                                total_rounds = EXCLUDED.total_rounds,
                                time_cap_per_round = EXCLUDED.time_cap_per_round,
                                description = EXCLUDED.description
                        """),
                        {
                            "id": row['id'],
                            "program_id": row['program_id'],
                            "pattern_type": row['pattern_type'],
                            "total_rounds": row['total_rounds'],
                            "time_cap_per_round": row['time_cap_per_round'],
                            "description": row['description']
                        }
                    )
                except Exception as e:
                    print(f"  ⚠️  Pattern {row['id']} 실패: {str(e)[:80]}")
            
            db.session.commit()
            print(f"✅ WorkoutPatterns: {len(patterns)}개")
        except sqlite3.OperationalError:
            print("⚠️  WorkoutPatterns 테이블 없음 (스킵)")
        
        # 6. ExerciseSets 마이그레이션
        print("\n=== ExerciseSets 마이그레이션 ===")
        try:
            sqlite_cursor.execute("SELECT * FROM exercise_sets")
            exercise_sets = sqlite_cursor.fetchall()
            
            for row in exercise_sets:
                try:
                    db.session.execute(
                        text("""
                            INSERT INTO exercise_sets (id, pattern_id, exercise_id, base_reps, 
                                                      progression_type, progression_value, order_index)
                            VALUES (:id, :pattern_id, :exercise_id, :base_reps,
                                    :progression_type, :progression_value, :order_index)
                            ON CONFLICT (id) DO UPDATE SET
                                base_reps = EXCLUDED.base_reps,
                                progression_type = EXCLUDED.progression_type,
                                progression_value = EXCLUDED.progression_value
                        """),
                        {
                            "id": row['id'],
                            "pattern_id": row['pattern_id'],
                            "exercise_id": row['exercise_id'],
                            "base_reps": row['base_reps'],
                            "progression_type": row['progression_type'],
                            "progression_value": row['progression_value'],
                            "order_index": row['order_index']
                        }
                    )
                except Exception as e:
                    print(f"  ⚠️  ExerciseSet {row['id']} 실패: {str(e)[:80]}")
            
            db.session.commit()
            print(f"✅ ExerciseSets: {len(exercise_sets)}개")
        except sqlite3.OperationalError:
            print("⚠️  ExerciseSets 테이블 없음 (스킵)")
        
        # 7. ProgramParticipants 마이그레이션
        print("\n=== ProgramParticipants 마이그레이션 ===")
        try:
            sqlite_cursor.execute("SELECT * FROM program_participants")
            participants = sqlite_cursor.fetchall()
            
            for row in participants:
                try:
                    db.session.execute(
                        text("""
                            INSERT INTO program_participants (id, program_id, user_id, status, 
                                                             joined_at, approved_at, left_at)
                            VALUES (:id, :program_id, :user_id, :status,
                                    :joined_at, :approved_at, :left_at)
                            ON CONFLICT (id) DO UPDATE SET
                                status = EXCLUDED.status,
                                approved_at = EXCLUDED.approved_at,
                                left_at = EXCLUDED.left_at
                        """),
                        {
                            "id": row['id'],
                            "program_id": row['program_id'],
                            "user_id": row['user_id'],
                            "status": row['status'],
                            "joined_at": row['joined_at'],
                            "approved_at": row['approved_at'],
                            "left_at": row['left_at']
                        }
                    )
                except Exception as e:
                    print(f"  ⚠️  Participant {row['id']} 실패: {str(e)[:80]}")
            
            db.session.commit()
            print(f"✅ ProgramParticipants: {len(participants)}개")
        except sqlite3.OperationalError:
            print("⚠️  ProgramParticipants 테이블 없음 (스킵)")
        
        # 8. WorkoutRecords 마이그레이션
        print("\n=== WorkoutRecords 마이그레이션 ===")
        try:
            sqlite_cursor.execute("SELECT * FROM workout_records")
            records = sqlite_cursor.fetchall()
            
            for row in records:
                try:
                    db.session.execute(
                        text("""
                            INSERT INTO workout_records (id, user_id, program_id, completion_time, 
                                                        completed_at, notes, is_public)
                            VALUES (:id, :user_id, :program_id, :completion_time,
                                    :completed_at, :notes, :is_public)
                            ON CONFLICT (id) DO UPDATE SET
                                completion_time = EXCLUDED.completion_time,
                                notes = EXCLUDED.notes,
                                is_public = EXCLUDED.is_public
                        """),
                        {
                            "id": row['id'],
                            "user_id": row['user_id'],
                            "program_id": row['program_id'],
                            "completion_time": row['completion_time'],
                            "completed_at": row['completed_at'],
                            "notes": row['notes'],
                            "is_public": bool(row['is_public'])
                        }
                    )
                except Exception as e:
                    print(f"  ⚠️  WorkoutRecord {row['id']} 실패: {str(e)[:80]}")
            
            db.session.commit()
            print(f"✅ WorkoutRecords: {len(records)}개")
        except sqlite3.OperationalError:
            print("⚠️  WorkoutRecords 테이블 없음 (스킵)")
        
        # 9. Notifications 마이그레이션
        print("\n=== Notifications 마이그레이션 ===")
        try:
            sqlite_cursor.execute("SELECT * FROM notifications")
            notifications = sqlite_cursor.fetchall()
            
            for row in notifications:
                try:
                    db.session.execute(
                        text("""
                            INSERT INTO notifications (id, user_id, program_id, type, title, 
                                                      message, is_read, created_at)
                            VALUES (:id, :user_id, :program_id, :type, :title,
                                    :message, :is_read, :created_at)
                            ON CONFLICT (id) DO UPDATE SET
                                is_read = EXCLUDED.is_read
                        """),
                        {
                            "id": row['id'],
                            "user_id": row['user_id'],
                            "program_id": row['program_id'],
                            "type": row['type'],
                            "title": row['title'],
                            "message": row['message'],
                            "is_read": bool(row['is_read']),
                            "created_at": row['created_at']
                        }
                    )
                except Exception as e:
                    print(f"  ⚠️  Notification {row['id']} 실패: {str(e)[:80]}")
            
            db.session.commit()
            print(f"✅ Notifications: {len(notifications)}개")
        except sqlite3.OperationalError:
            print("⚠️  Notifications 테이블 없음 (스킵)")
        
        print("\n🎉 마이그레이션 완료!")
        
    sqlite_conn.close()
    return True

if __name__ == '__main__':
    print("="*60)
    print("SQLite → PostgreSQL 데이터 마이그레이션")
    print("="*60)
    
    # DATABASE_URL 확인
    db_url = os.environ.get('DATABASE_URL', app.config.get('SQLALCHEMY_DATABASE_URI', ''))
    print(f"\n📊 Target DB: {db_url[:50]}...")
    
    if 'sqlite' in db_url.lower():
        print("\n❌ 현재 SQLite를 사용 중입니다.")
        print("   DATABASE_URL 환경 변수를 PostgreSQL로 설정해주세요:")
        print("   export DATABASE_URL=postgresql://crossfit_user:crossfit_password@localhost:5432/crossfit")
        sys.exit(1)
    
    confirm = input("\n⚠️  PostgreSQL 데이터베이스의 모든 데이터가 덮어씌워집니다. 계속하시겠습니까? (yes/no): ")
    if confirm.lower() != 'yes':
        print("❌ 취소되었습니다.")
        sys.exit(0)
    
    if migrate_data():
        print("\n✅ 모든 데이터가 성공적으로 마이그레이션되었습니다!")
    else:
        print("\n❌ 마이그레이션 실패")
        sys.exit(1)

