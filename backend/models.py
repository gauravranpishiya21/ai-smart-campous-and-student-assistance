# Consolidated Models & ML Predictor
# Merged from: model_curriculum, model_gpa, model_obe, model_timetable,
#              model_topic_progress, model_faculty_research,
#              model_faculty_performance, model_engagement_analytics,
#              and model.py (ML marks predictor)

from sqlalchemy import Column, Integer, Float, String, Text, ForeignKey, Time
from sqlalchemy.orm import relationship
from db import Base
import numpy as np
from sklearn.ensemble import RandomForestRegressor


# ---------------------------------------------------------------------------
# Curriculum Management
# ---------------------------------------------------------------------------

class Curriculum(Base):
    __tablename__ = 'curriculums'
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    semesters = relationship('Semester', back_populates='curriculum')


class Semester(Base):
    __tablename__ = 'semesters'
    id = Column(Integer, primary_key=True)
    curriculum_id = Column(Integer, ForeignKey('curriculums.id'))
    number = Column(Integer, nullable=False)
    curriculum = relationship('Curriculum', back_populates='semesters')
    subjects = relationship('Subject', back_populates='semester')


class Subject(Base):
    __tablename__ = 'subjects'
    id = Column(Integer, primary_key=True)
    semester_id = Column(Integer, ForeignKey('semesters.id'))
    code = Column(String(20), nullable=False)
    name = Column(String(100), nullable=False)
    credits = Column(Integer, nullable=False)
    syllabus = Column(Text)
    semester = relationship('Semester', back_populates='subjects')


# ---------------------------------------------------------------------------
# Credit & GPA Management
# ---------------------------------------------------------------------------

class StudentGPA(Base):
    __tablename__ = 'student_gpa'
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey('students.id'))
    semester = Column(Integer, nullable=False)
    gpa = Column(Float, nullable=False)
    credits_earned = Column(Integer, nullable=False)
    backlogs = Column(Integer, default=0)


# ---------------------------------------------------------------------------
# OBE (Outcome-Based Education)
# ---------------------------------------------------------------------------

class OBEOutcome(Base):
    __tablename__ = 'obe_outcomes'
    id = Column(Integer, primary_key=True)
    subject_id = Column(Integer, ForeignKey('subjects.id'))
    outcome_type = Column(String(10), nullable=False)   # 'CO' or 'PO'
    outcome_code = Column(String(20), nullable=False)    # e.g., 'CO1', 'PO2'
    description = Column(Text, nullable=False)
    subject = relationship('Subject')


# ---------------------------------------------------------------------------
# Timetable
# ---------------------------------------------------------------------------

class Timetable(Base):
    __tablename__ = 'timetables'
    id = Column(Integer, primary_key=True)
    dept_id = Column(Integer, nullable=False)
    semester = Column(Integer, nullable=False)
    day_of_week = Column(String(10), nullable=False)
    start_time = Column(String(5), nullable=False)   # e.g., '09:00'
    end_time = Column(String(5), nullable=False)      # e.g., '10:30'
    subject_id = Column(Integer, ForeignKey('subjects.id'))
    room_number = Column(String(20), nullable=False)
    subject = relationship('Subject')


# ---------------------------------------------------------------------------
# Topic Progress (for AI Recommendation)
# ---------------------------------------------------------------------------

class TopicProgress(Base):
    __tablename__ = 'topic_progress'
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey('students.id'))
    subject_id = Column(Integer, ForeignKey('subjects.id'))
    topic_name = Column(String(100), nullable=False)
    progress_pct = Column(Float, default=0.0)
    last_reviewed = Column(String(20))  # ISO date string


# ---------------------------------------------------------------------------
# Faculty Research
# ---------------------------------------------------------------------------

class FacultyResearch(Base):
    __tablename__ = 'faculty_research'
    id = Column(Integer, primary_key=True)
    faculty_id = Column(Integer, ForeignKey('users.id'))
    title = Column(String(200), nullable=False)
    research_type = Column(String(20), nullable=False)  # 'paper', 'publication', 'patent'
    description = Column(Text)
    url = Column(String(300))
    year = Column(Integer)
    faculty = relationship('User')


# ---------------------------------------------------------------------------
# Faculty Performance Evaluation
# ---------------------------------------------------------------------------

class FacultyFeedback(Base):
    __tablename__ = 'faculty_feedback'
    id = Column(Integer, primary_key=True)
    faculty_id = Column(Integer, ForeignKey('users.id'))
    student_id = Column(Integer, ForeignKey('students.id'))
    rating = Column(Float, nullable=False)  # 1-5 scale
    comments = Column(Text)
    created_at = Column(String(20))  # ISO date string
    faculty = relationship('User')
    student = relationship('Student')


class FacultyPerformance(Base):
    __tablename__ = 'faculty_performance'
    id = Column(Integer, primary_key=True)
    faculty_id = Column(Integer, ForeignKey('users.id'))
    avg_rating = Column(Float, default=0.0)
    feedback_count = Column(Integer, default=0)
    analytics_json = Column(Text, default='{}')
    faculty = relationship('User')


# ---------------------------------------------------------------------------
# Classroom Engagement Analytics
# ---------------------------------------------------------------------------

class EngagementAnalytics(Base):
    __tablename__ = 'engagement_analytics'
    id = Column(Integer, primary_key=True)
    class_id = Column(Integer, nullable=False)
    faculty_id = Column(Integer, ForeignKey('users.id'))
    date = Column(String(20), nullable=False)  # ISO date string
    quiz_participation = Column(Float, default=0.0)       # %
    attendance_interaction = Column(Float, default=0.0)    # %
    notes = Column(String(300), default='')
    faculty = relationship('User')


# ---------------------------------------------------------------------------
# ML Model & Grade Predictor (consolidated from model.py)
# ---------------------------------------------------------------------------

ml_model = RandomForestRegressor(n_estimators=100, random_state=42)

_X_train = np.array([
    [2, 7, 90],
    [3, 8, 85],
    [1, 6, 70],
    [4, 9, 95],
    [2.5, 7.5, 88],
    [0.5, 5, 60],
    [3.5, 8.5, 92]
])

_y_train = np.array([75, 82, 65, 90, 80, 55, 87])

ml_model.fit(_X_train, _y_train)

# Aliased for backward compatibility if referenced directly as model
model = ml_model


def predict_marks(study_hours, sleep_hours, attendance):
    features = np.array([[study_hours, sleep_hours, attendance]])
    return float(ml_model.predict(features)[0])
