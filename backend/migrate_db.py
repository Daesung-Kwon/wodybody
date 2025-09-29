# PostgreSQL 마이그레이션 스크립트
# SQLite에서 PostgreSQL로 마이그레이션

import os
import sqlite3
import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Flask
from flask_sqlalchemy import SQLAlchemy

def migrate_sqlite_to_postgres():
    """SQLite 데이터를 PostgreSQL로 마이그레이션"""
    
    # SQLite 연결
    sqlite_conn = sqlite3.connect('instance/crossfit.db')
    sqlite_cursor = sqlite_conn.cursor()
    
    # PostgreSQL 연결
    postgres_conn = psycopg2.connect(os.environ.get('DATABASE_URL'))
    postgres_cursor = postgres_conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # 테이블 목록 가져오기
        sqlite_cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = sqlite_cursor.fetchall()
        
        for table in tables:
            table_name = table[0]
            print(f"마이그레이션 중: {table_name}")
            
            # SQLite에서 데이터 가져오기
            sqlite_cursor.execute(f"SELECT * FROM {table_name}")
            rows = sqlite_cursor.fetchall()
            
            # 컬럼 정보 가져오기
            sqlite_cursor.execute(f"PRAGMA table_info({table_name})")
            columns = sqlite_cursor.fetchall()
            column_names = [col[1] for col in columns]
            
            # PostgreSQL에 데이터 삽입
            for row in rows:
                placeholders = ', '.join(['%s'] * len(row))
                columns_str = ', '.join(column_names)
                query = f"INSERT INTO {table_name} ({columns_str}) VALUES ({placeholders})"
                
                try:
                    postgres_cursor.execute(query, row)
                except Exception as e:
                    print(f"오류 발생 (테이블: {table_name}): {e}")
                    continue
            
            postgres_conn.commit()
            print(f"완료: {table_name} ({len(rows)}개 레코드)")
    
    except Exception as e:
        print(f"마이그레이션 오류: {e}")
        postgres_conn.rollback()
    
    finally:
        sqlite_conn.close()
        postgres_conn.close()

if __name__ == "__main__":
    migrate_sqlite_to_postgres()
