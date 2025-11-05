"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addProfessor = addProfessor;
exports.validateLesson = validateLesson;
exports.addLesson = addLesson;
exports.findAvailableClassrooms = findAvailableClassrooms;
exports.getProfessorSchedule = getProfessorSchedule;
exports.getClassroomUtilization = getClassroomUtilization;
exports.getMostPopularCourseType = getMostPopularCourseType;
exports.reassignClassroom = reassignClassroom;
exports.cancelLesson = cancelLesson;
/* =========================
   3) МАСИВИ ТА ДАНІ
   ========================= */
const professors = [
    { id: 1, name: "Dr. Alice Novak", department: "CS" },
    { id: 2, name: "Dr. Bohdan Petrenko", department: "Math" }
];
const classrooms = [
    { number: "A101", capacity: 60, hasProjector: true },
    { number: "A102", capacity: 30, hasProjector: false },
    { number: "B201", capacity: 45, hasProjector: true }
];
const courses = [
    { id: 10, name: "Algorithms", type: "Lecture" },
    { id: 11, name: "Discrete Math", type: "Seminar" },
    { id: 12, name: "Web Dev Lab", type: "Lab" }
];
// «База» розкладу
const schedule = [];
let nextLessonId = 1;
/* =========================
   4) ДОДАВАННЯ ДАНИХ
   ========================= */
function addProfessor(professor) {
    const exists = professors.some(p => p.id === professor.id);
    if (exists)
        throw new Error("Professor with this id already exists");
    professors.push(professor);
}
// повертає перший знайдений конфлікт або null
function validateLesson(lesson) {
    // перевіримо, що згадані сутності існують
    const profOk = professors.some(p => p.id === lesson.professorId);
    const classOk = classrooms.some(c => c.number === lesson.classroomNumber);
    const courseOk = courses.some(c => c.id === lesson.courseId);
    if (!profOk || !classOk || !courseOk) {
        // базова валідація посилань
        throw new Error("Invalid foreign key in lesson (professor/course/classroom not found)");
    }
    // перетин за тим самим часом і днем
    const conflict = schedule.find(s => s.dayOfWeek === lesson.dayOfWeek &&
        s.timeSlot === lesson.timeSlot &&
        (s.professorId === lesson.professorId || s.classroomNumber === lesson.classroomNumber));
    if (!conflict)
        return null;
    const type = conflict.professorId === lesson.professorId ? "ProfessorConflict" : "ClassroomConflict";
    return { type, lessonDetails: lesson };
}
/* =========================
   6) ДОДАТИ ЗАНЯТТЯ
   ========================= */
function addLesson(lesson) {
    const conflict = validateLesson(lesson);
    if (conflict)
        return false;
    schedule.push({ id: nextLessonId++, ...lesson });
    return true;
}
/* =========================
   7) ПОШУК/ФІЛЬТРАЦІЯ
   ========================= */
function findAvailableClassrooms(timeSlot, dayOfWeek) {
    // усі аудиторії, де в цей час немає заняття
    const busy = new Set(schedule
        .filter(s => s.timeSlot === timeSlot && s.dayOfWeek === dayOfWeek)
        .map(s => s.classroomNumber));
    return classrooms
        .filter(c => !busy.has(c.number))
        .map(c => c.number);
}
function getProfessorSchedule(professorId) {
    return schedule.filter(s => s.professorId === professorId);
}
/* =========================
   8) АНАЛІЗ / ЗВІТИ
   ========================= */
// коефіцієнт використання аудиторії = (кількість занять у ній) / (максимально можливих комірок)
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const SLOTS = ["8:30-10:00", "10:15-11:45", "12:15-13:45", "14:00-15:30", "15:45-17:15"];
function getClassroomUtilization(classroomNumber) {
    // total cells = днів * слотів
    const totalCells = DAYS.length * SLOTS.length;
    const used = schedule.filter(s => s.classroomNumber === classroomNumber).length;
    const ratio = used / totalCells;
    // у відсотках (0..100), округлимо до одного знака
    return Math.round(ratio * 1000) / 10;
}
function getMostPopularCourseType() {
    // рахуємо типи за розкладом (йдемо через courseId)
    const counts = { Lecture: 0, Seminar: 0, Lab: 0, Practice: 0 };
    for (const s of schedule) {
        const c = courses.find(x => x.id === s.courseId);
        if (c)
            counts[c.type] += 1;
    }
    // знаходимо максимум
    let best = "Lecture";
    let bestCount = -1;
    Object.keys(counts).forEach((t) => {
        if (counts[t] > bestCount) {
            best = t;
            bestCount = counts[t];
        }
    });
    return best;
}
/* =========================
   9) МОДИФІКАЦІЇ
   ========================= */
function reassignClassroom(lessonId, newClassroomNumber) {
    const idx = schedule.findIndex(s => s.id === lessonId);
    if (idx === -1)
        return false;
    // спробуємо якби ми додавали новий урок з новою аудиторією
    const { id, ...lessonWithoutId } = schedule[idx];
    const candidate = { ...lessonWithoutId, classroomNumber: newClassroomNumber };
    const conflict = validateLesson(candidate);
    if (conflict && conflict.type === "ClassroomConflict")
        return false;
    schedule[idx].classroomNumber = newClassroomNumber;
    return true;
}
function cancelLesson(lessonId) {
    const idx = schedule.findIndex(s => s.id === lessonId);
    if (idx !== -1)
        schedule.splice(idx, 1);
}
/* =========================
   10) ДЕМОНСТРАЦІЯ РОБОТИ
   ========================= */
function demo() {
    // додамо кілька занять
    addLesson({
        courseId: 10, professorId: 1, classroomNumber: "A101",
        dayOfWeek: "Monday", timeSlot: "8:30-10:00"
    });
    addLesson({
        courseId: 11, professorId: 2, classroomNumber: "A102",
        dayOfWeek: "Monday", timeSlot: "8:30-10:00"
    });
    // конфлікт: той самий професор у той самий час
    const ok = addLesson({
        courseId: 12, professorId: 1, classroomNumber: "B201",
        dayOfWeek: "Monday", timeSlot: "8:30-10:00"
    });
    console.log("Спроба додати конфліктне заняття:", ok); // false
    console.log("Вільні аудиторії у Mon 8:30:", findAvailableClassrooms("8:30-10:00", "Monday"));
    console.log("Розклад професора #1:", getProfessorSchedule(1));
    console.log("Використання A101, %:", getClassroomUtilization("A101"));
    console.log("Найпопулярніший тип курсу:", getMostPopularCourseType());
    // перенесення аудиторії першого заняття
    const firstId = schedule[0]?.id;
    console.log("Переназначення аудиторії:", reassignClassroom(firstId, "B201"));
    // скасування
    cancelLesson(firstId);
    console.log("Після відміни заняття, розклад професора #1:", getProfessorSchedule(1));
}
demo();
//# sourceMappingURL=index.js.map