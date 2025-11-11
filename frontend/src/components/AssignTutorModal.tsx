import { useEffect, useState, type MouseEvent } from "react";
import { apiClient } from "../api/client";
import { StudentItem, TutorAssignmentItem, TutorCatalogItem } from "../types";

export type AssignTutorModalProps = {
  open: boolean;
  onClose: () => void;
  student: StudentItem | null;
  periodo?: number;
  currentAssignment?: TutorAssignmentItem;
  onTutorAssigned: (payload: { tutor: TutorCatalogItem; studentId: number }) => Promise<void> | void;
};

export function AssignTutorModal({
  open,
  onClose,
  student,
  periodo,
  currentAssignment,
  onTutorAssigned
}: AssignTutorModalProps) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<TutorCatalogItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [modalSelection, setModalSelection] = useState<TutorCatalogItem | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTerm("");
    setResults([]);
    setModalError(null);
    setModalMessage(null);
    setModalSelection(mapAssignmentToTutorItem(currentAssignment));
  }, [currentAssignment?.id_tutor, open]);

  if (!open) {
    return null;
  }

  const studentName = student ? studentDisplay(student) : "Seleccione un estudiante";
  const periodoLabel = currentAssignment?.periodo ?? (periodo ? `Periodo ${periodo}` : "Sin periodo seleccionado");

  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleSearch = async () => {
    const value = term.trim();
    if (!value) {
      setModalError("Ingrese un nombre o DNI para buscar.");
      setResults([]);
      return;
    }
    setSearching(true);
    setModalError(null);
    setModalMessage(null);
    try {
      const data = await apiClient.getTutors({ termino: value, limit: 10 });
      setResults(data);
      if (data.length === 0) {
        setModalError("No se encontraron tutores para el termino indicado.");
      }
    } catch (err) {
      setModalError((err as Error).message);
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAssign = async () => {
    if (!student || !periodo) {
      setModalError("Seleccione el periodo y el estudiante para continuar.");
      return;
    }
    if (!modalSelection) {
      setModalError("Seleccione un tutor antes de guardar.");
      return;
    }
    setSaving(true);
    setModalError(null);
    try {
      const payloadToSend = {
        id_estudiante: student.id_estudiante,
        id_periodo: periodo,
        id_tutor: modalSelection.id_tutor
      };
      await apiClient.assignTutor(payloadToSend);
      setModalMessage("Asignacion guardada.");
      await onTutorAssigned({ tutor: modalSelection, studentId: student.id_estudiante });
    } catch (err) {
      setModalError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="role-modal__overlay" role="dialog" aria-modal="true" onClick={handleOverlayClick}>
      <div className="role-modal assignment-modal" role="document">
        <header className="assignment-modal__header">
          <div>
            <h2>Asignar tutor</h2>
            <p className="field__hint">El tutor asignado se usara como referencia predeterminada para las tutorias.</p>
          </div>
          <button type="button" className="role-modal__close" onClick={onClose} aria-label="Cerrar ventana">
            &times;
          </button>
        </header>
        <div className="assignment-modal__meta">
          <p>
            <strong>Estudiante:</strong> {studentName}
          </p>
          <p>
            <strong>Periodo:</strong> {periodoLabel}
          </p>
          {currentAssignment?.tutor && (
            <p className="assignment-modal__current">
              <strong>Tutor actual:</strong> {currentAssignment.tutor}
            </p>
          )}
        </div>
        <div className="assignment-modal__body">
          <div className="assignment-modal__search">
            <input
              type="text"
              className="field__control"
              placeholder="Buscar docente por nombre o DNI"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
            />
            <button type="button" className="button button--ghost" onClick={handleSearch} disabled={searching}>
              {searching ? "Buscando..." : "Buscar"}
            </button>
          </div>
          {modalSelection && (
            <div className="assignment-modal__selection">
              <div>
                <strong>{modalSelection.nombre ?? "Tutor sin nombre"}</strong>
                <p className="field__hint">
                  {modalSelection.dni ? `${modalSelection.dni} - ` : ""}
                  {modalSelection.correo ?? "Sin correo"}
                </p>
              </div>
              <button type="button" className="button button--ghost" onClick={() => setModalSelection(null)}>
                Limpiar
              </button>
            </div>
          )}
          {modalError && <p className="field__hint field__hint--error">{modalError}</p>}
          {modalMessage && <p className="field__hint field__hint--success">{modalMessage}</p>}
          {results.length > 0 && (
            <div className="assignment-modal__results">
              {results.map((tutor) => (
                <article key={tutor.id_tutor} className="assignment-modal__result">
                  <div>
                    <strong>{tutor.nombre ?? "Tutor sin nombre"}</strong>
                    <p className="field__hint">
                      {tutor.dni ? `${tutor.dni} - ` : ""}
                      {tutor.correo ?? "Sin correo"}
                    </p>
                  </div>
                  <button type="button" className="button button--primary" onClick={() => setModalSelection(tutor)}>
                    Seleccionar
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
        <div className="assignment-modal__actions">
          <button type="button" className="button button--ghost" onClick={onClose}>
            Cerrar
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={handleAssign}
            disabled={!student || !periodo || !modalSelection || saving}
          >
            {saving ? "Guardando..." : "Guardar asignacion"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function mapAssignmentToTutorItem(assignment?: TutorAssignmentItem): TutorCatalogItem | null {
  if (!assignment?.id_tutor) {
    return null;
  }
  return {
    id_tutor: assignment.id_tutor,
    nombre: assignment.tutor ?? null,
    dni: assignment.tutor_dni ?? undefined,
    correo: assignment.tutor_correo ?? undefined
  };
}

function studentDisplay(student: StudentItem): string {
  const parts = [student.apellido_paterno, student.apellido_materno, student.nombres]
    .filter(Boolean)
    .join(" ")
    .trim();
  const visible = parts || student.codigo_alumno || "Sin nombre";
  return student.dni ? `${student.dni} - ${visible}` : visible;
}
