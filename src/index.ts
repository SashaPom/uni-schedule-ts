/* =========================
   1) TYPE ALIASES / UNIONS
   ========================= */
// дні тижня: лише робочі (Mo–Fr)
export type DayOfWeek = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";
// часові слоти
export type TimeSlot =
    | "8:30-10:00"
    | "10:15-11:45"
    | "12:15-13:45"
    | "14:00-15:30"
    | "15:45-17:15";
// типи занять
export type CourseType = "Lecture" | "Seminar" | "Lab" | "Practice";

/* =========================
   2) ОСНОВНІ СТРУКТУРИ
   ========================= */
export type Professor = { id: number; name: string; department: string };
export type Classroom = { number: string; capacity: number; hasProjector: boolean };
export type Course = { id: number; name: string; type: CourseType };
export type Lesson = {
    courseId: number;
    professorId: number;
    classroomNumber: string;
    dayOfWeek: DayOfWeek;
    timeSlot: TimeSlot;
};

// Внутрішнє представлення елемента розкладу зі зручним id
type ScheduledLesson = Lesson & { id: number };

/* =========================
   3) МАСИВИ ТА ДАНІ
   ========================= */
const professors: Professor[] = [
    { id: 1, name: "Dr. Alice Novak", department: "CS" },
    { id: 2, name: "Dr. Bohdan Petrenko", department: "Math" }
];

const classrooms: Classroom[] = [
    { number: "A101", capacity: 60, hasProjector: true },
    { number: "A102", capacity: 30, hasProjector: false },
    { number: "B201", capacity: 45, hasProjector: true }
];

const courses: Course[] = [
    { id: 10, name: "Algorithms", type: "Lecture" },
    { id: 11, name: "Discrete Math", type: "Seminar" },
    { id: 12, name: "Web Dev Lab", type: "Lab" }
];

// «База» розкладу
const schedule: ScheduledLesson[] = [];
let nextLessonId = 1;

/* =========================
   4) ДОДАВАННЯ ДАНИХ
   ========================= */
export function addProfessor(professor: Professor): void {
    const exists: boolean = professors.some(p => p.id === professor.id);
    if (exists) throw new Error("Professor with this id already exists");
    professors.push(professor);
}

/* =========================
   5) ВАЛІДАЦІЯ/КОНФЛІКТИ
   ========================= */
export type ScheduleConflictType = "ProfessorConflict" | "ClassroomConflict";
export type ScheduleConflict = { type: ScheduleConflictType; lessonDetails: Lesson };

// повертає перший знайдений конфлікт або null
export function validateLesson(lesson: Lesson): ScheduleConflict | null {
    // перевіримо, що згадані сутності існують
    const profOk: boolean = professors.some(p => p.id === lesson.professorId);
    const classOk: boolean = classrooms.some(c => c.number === lesson.classroomNumber);
    const courseOk: boolean = courses.some(c => c.id === lesson.courseId);
    if (!profOk || !classOk || !courseOk) {
        // базова валідація посилань
        throw new Error("Invalid foreign key in lesson (professor/course/classroom not found)");
    }

    // перетин за тим самим часом і днем
    const conflict = schedule.find(
        s =>
            s.dayOfWeek === lesson.dayOfWeek &&
            s.timeSlot === lesson.timeSlot &&
            (s.professorId === lesson.professorId || s.classroomNumber === lesson.classroomNumber)
    );

    if (!conflict) return null;

    const type: ScheduleConflictType =
        conflict.professorId === lesson.professorId ? "ProfessorConflict" : "ClassroomConflict";
    return { type, lessonDetails: lesson };
}

/* =========================
   6) ДОДАТИ ЗАНЯТТЯ
   ========================= */
export function addLesson(lesson: Lesson): boolean {
    const conflict: ScheduleConflict | null = validateLesson(lesson);
    if (conflict) return false;
    schedule.push({ id: nextLessonId++, ...lesson });
    return true;
}

/* =========================
   7) ПОШУК/ФІЛЬТРАЦІЯ
   ========================= */
export function findAvailableClassrooms(timeSlot: TimeSlot, dayOfWeek: DayOfWeek): string[] {
    // усі аудиторії, де в цей час немає заняття
    const busy: Set<string> = new Set(
        schedule
            .filter(s => s.timeSlot === timeSlot && s.dayOfWeek === dayOfWeek)
            .map(s => s.classroomNumber)
    );
    return classrooms
        .filter(c => !busy.has(c.number))
        .map(c => c.number);
}

export function getProfessorSchedule(professorId: number): Lesson[] {
    return schedule.filter(s => s.professorId === professorId);
}

/* =========================
   8) АНАЛІЗ / ЗВІТИ
   ========================= */
// коефіцієнт використання аудиторії = (кількість занять у ній) / (максимально можливих комірок)
const DAYS: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const SLOTS: TimeSlot[] = ["8:30-10:00","10:15-11:45","12:15-13:45","14:00-15:30","15:45-17:15"];

export function getClassroomUtilization(classroomNumber: string): number {
    // total cells = днів * слотів
    const totalCells: number = DAYS.length * SLOTS.length;
    const used: number = schedule.filter(s => s.classroomNumber === classroomNumber).length;
    const ratio: number = used / totalCells;
    // у відсотках (0..100), округлимо до одного знака
    return Math.round(ratio * 1000) / 10;
}

export function getMostPopularCourseType(): CourseType {
    // рахуємо типи за розкладом (йдемо через courseId)
    const counts: Record<CourseType, number> = { Lecture: 0, Seminar: 0, Lab: 0, Practice: 0 };
    for (const s of schedule) {
        const c = courses.find(x => x.id === s.courseId);
        if (c) counts[c.type] += 1;
    }
    // знаходимо максимум
    let best: CourseType = "Lecture";
    let bestCount = -1;
    (Object.keys(counts) as CourseType[]).forEach((t: CourseType) => {
        if (counts[t] > bestCount) { best = t; bestCount = counts[t]; }
    });
    return best;
}

/* =========================
   9) МОДИФІКАЦІЇ
   ========================= */
export function reassignClassroom(lessonId: number, newClassroomNumber: string): boolean {
    const idx: number = schedule.findIndex(s => s.id === lessonId);
    if (idx === -1) return false;

    // спробуємо якби ми додавали новий урок з новою аудиторією
    const { id, ...lessonWithoutId } = schedule[idx];
    const candidate: Lesson = { ...lessonWithoutId, classroomNumber: newClassroomNumber };    const conflict: ScheduleConflict | null = validateLesson(candidate);
    if (conflict && conflict.type === "ClassroomConflict") return false;

    schedule[idx].classroomNumber = newClassroomNumber;
    return true;
}

export function cancelLesson(lessonId: number): void {
    const idx: number = schedule.findIndex(s => s.id === lessonId);
    if (idx !== -1) schedule.splice(idx, 1);
}

/* =========================
   10) ДЕМОНСТРАЦІЯ РОБОТИ
   ========================= */
function demo(): void {
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
    const ok: boolean = addLesson({
        courseId: 12, professorId: 1, classroomNumber: "B201",
        dayOfWeek: "Monday", timeSlot: "8:30-10:00"
    });
    console.log("Спроба додати конфліктне заняття:", ok); // false

    console.log("Вільні аудиторії у Mon 8:30:", findAvailableClassrooms("8:30-10:00", "Monday"));
    console.log("Розклад професора #1:", getProfessorSchedule(1));

    console.log("Використання A101, %:", getClassroomUtilization("A101"));
    console.log("Найпопулярніший тип курсу:", getMostPopularCourseType());

    // перенесення аудиторії першого заняття
    const firstId: number = schedule[0]?.id as number;
    console.log("Переназначення аудиторії:", reassignClassroom(firstId, "B201"));

    // скасування
    cancelLesson(firstId);
    console.log("Після відміни заняття, розклад професора #1:", getProfessorSchedule(1));
}
demo();
