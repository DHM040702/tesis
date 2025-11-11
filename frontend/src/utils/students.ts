import { StudentItem, TutorAssignmentItem } from "../types";

export function formatStudentDisplay(student: StudentItem): string {
  const parts = [student.apellido_paterno, student.apellido_materno, student.nombres]
    .filter(Boolean)
    .join(" ")
    .trim();
  const visible = parts || student.codigo_alumno || "Sin nombre";
  return student.dni ? `${student.dni} - ${visible}` : visible;
}

export function studentFromAssignment(assignment: TutorAssignmentItem): StudentItem {
  return {
    id_estudiante: assignment.id_estudiante,
    dni: assignment.dni ?? undefined,
    programa: assignment.programa ?? undefined,
    periodo: assignment.periodo ?? undefined,
    nombres: assignment.estudiante ?? undefined
  };
}
