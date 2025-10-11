"""운동 관련 라우트"""

from flask import Blueprint, jsonify, request, current_app
from config.database import db
from models.exercise import ExerciseCategories, Exercises, ProgramExercises

# 블루프린트 생성
bp = Blueprint('exercises', __name__, url_prefix='/api')


@bp.route('/exercise-categories', methods=['GET'])
def get_exercise_categories():
    """운동 카테고리 목록 조회"""
    try:
        categories = ExerciseCategories.query.filter_by(is_active=True).order_by(ExerciseCategories.name).all()
        result = []
        for cat in categories:
            result.append({
                'id': cat.id,
                'name': cat.name,
                'description': cat.description
            })
        return jsonify({'categories': result}), 200
    except Exception as e:
        current_app.logger.exception('get_exercise_categories error: %s', str(e))
        return jsonify({'message': '운동 카테고리 조회 중 오류가 발생했습니다'}), 500


@bp.route('/exercises', methods=['GET'])
def get_exercises():
    """운동 종류 목록 조회"""
    try:
        category_id = request.args.get('category_id', type=int)
        
        query = Exercises.query.filter_by(is_active=True)
        if category_id:
            query = query.filter_by(category_id=category_id)
        
        exercises = query.order_by(Exercises.name).all()
        
        result = []
        for ex in exercises:
            result.append({
                'id': ex.id,
                'category_id': ex.category_id,
                'name': ex.name,
                'description': ex.description
            })
        
        return jsonify({'exercises': result}), 200
    except Exception as e:
        current_app.logger.exception('get_exercises error: %s', str(e))
        return jsonify({'message': '운동 종류 조회 중 오류가 발생했습니다'}), 500


@bp.route('/programs/<int:program_id>/exercises', methods=['GET'])
def get_program_exercises(program_id):
    """프로그램에 포함된 운동 목록 조회"""
    try:
        program_exercises = ProgramExercises.query.filter_by(
            program_id=program_id
        ).order_by(ProgramExercises.order_index).all()
        
        result = []
        for pe in program_exercises:
            if pe.exercise:
                result.append({
                    'id': pe.exercise.id,
                    'name': pe.exercise.name,
                    'description': pe.exercise.description,
                    'category_id': pe.exercise.category_id,
                    'target_value': pe.target_value,
                    'order': pe.order_index
                })
        
        return jsonify({'exercises': result}), 200
    except Exception as e:
        current_app.logger.exception('get_program_exercises error: %s', str(e))
        return jsonify({'message': '프로그램 운동 조회 중 오류가 발생했습니다'}), 500

