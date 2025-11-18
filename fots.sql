SELECT 
    e.codigo_alumno,
    pa.nombre AS periodo_academico,
    p.nombre AS escuela_profesional,
    em.nombre AS estado_academico
FROM
    matriculas m
        JOIN
    estudiantes e ON e.id_estudiante = m.id_estudiante
        JOIN
    periodos_academicos pa ON pa.id_periodo = m.id_periodo
        JOIN
    programas p ON p.id_programa = e.id_programa
        JOIN
    estados_matricula em ON em.id_estado_matricula = m.id_estado_matricula
WHERE
    pa.nombre BETWEEN '2020-I' AND '2024-II'
ORDER BY e.codigo_alumno , pa.nombre;

-- Vista 2
SELECT 
    e.codigo_alumno,
    pa.nombre AS periodo_academico,
    cur.codigo AS codigo_curso,
    cur.nombre AS nombre_curso,
    c.nota_final AS promedio_final
FROM
    calificaciones c
        JOIN
    matriculas m ON m.id_matricula = c.id_matricula
        JOIN
    cursos cur ON cur.id_curso = m.id_curso
        JOIN
    periodos_academicos pa ON pa.id_periodo = m.id_periodo
        JOIN
    estudiantes e ON e.id_estudiante = m.id_estudiante
WHERE
    pa.nombre BETWEEN '2020-I' AND '2024-II'
ORDER BY e.codigo_alumno , pa.nombre;

-- Vista 3
SELECT 
    e.codigo_alumno,
    pa.nombre,
    ROUND(AVG(c.nota_final), 2) AS promedio_periodo
FROM
    calificaciones c
        JOIN
    matriculas m ON m.id_matricula = c.id_matricula
        JOIN
    cursos cur ON cur.id_curso = m.id_curso
        JOIN
    periodos_academicos pa ON pa.id_periodo = m.id_periodo
        JOIN
    estudiantes e ON e.id_estudiante = m.id_estudiante
GROUP BY e.codigo_alumno , pa.nombre
ORDER BY e.codigo_alumno , pa.nombre;

-- vista 4
SELECT 
    e.codigo_alumno,
    pa.nombre,
    a.asistencia_pct AS porcentaje_asistencia
FROM
    asistencias_periodo_curso a
        JOIN
    cursos cur ON cur.id_curso = a.id_curso
        JOIN
    matriculas m ON m.id_curso = cur.id_curso
        JOIN
    periodos_academicos pa ON pa.id_periodo = a.id_periodo
        JOIN
    estudiantes e ON e.id_estudiante = m.id_estudiante
GROUP BY e.codigo_alumno , pa.nombre
ORDER BY e.codigo_alumno , pa.nombre;