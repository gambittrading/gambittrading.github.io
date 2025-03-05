// app.js
document.addEventListener('DOMContentLoaded', async () => {
    /* const loadCSV = async (file) => {
        const response = await fetch(`data/${file}`);
        const text = await response.text();
        return text.split('\n').slice(1).map(row => {
            const values = row.split(',');
            return values;
        });
    }; */
    // app.js (Versión corregida)
const loadCSV = async (file) => {
    const response = await fetch(`data/${file}`);
    const text = await response.text();
    return text
        .split('\n')
        .slice(1)
        .map(row => row.trim()) // Eliminar espacios y \r
        .filter(row => row !== '') // Ignorar filas vacías
        .map(row => {
            const values = row.split(',');
            return values.map(v => v.replace(/^"(.*)"$/, '$1')); // Eliminar comillas
        });
};

    const instituciones = await loadCSV('instituciones.csv');
    const alumnos = await loadCSV('alumnos.csv');
    const materias = await loadCSV('materias.csv');
    const alumnosMaterias = await loadCSV('alumnos_materias.csv');
    const notas = await loadCSV('notas.csv');
    const profesores = await loadCSV('profesores.csv');
    const profesoresMaterias = await loadCSV('profesores_materias.csv');
    const asistencia = await loadCSV('asistencia.csv');

    // Cargar instituciones en el select
    const institucionesSelect = document.getElementById('instituciones');
    instituciones.forEach(([id, nombre, direccion, telefono, correo]) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = nombre;
        institucionesSelect.appendChild(option);
    });

    institucionesSelect.addEventListener('change', (e) => {
        const idInstitucion = e.target.value;
        const estudiantesContainer = document.getElementById('estudiantes-container');
        const materiasSelect = document.getElementById('materias');
        
        // Limpiar contenedores
        estudiantesContainer.innerHTML = '';
        materiasSelect.innerHTML = '<option value="">Seleccione una materia</option>';
        
        if (idInstitucion) {
            // Filtrar estudiantes
            const estudiantes = alumnos.filter(alumno => alumno[4] === idInstitucion);
            
            // Mostrar estudiantes
            estudiantes.forEach(([id, nombre, fecha, correo, institucion, descripcion, activo, documento]) => {
                const studentDiv = document.createElement('div');
                studentDiv.className = `student-item ${activo === '0' ? 'inactive-student' : ''}`;
                
                studentDiv.innerHTML = `
                    <div class="student-info">
                        <strong>${nombre}</strong>
                        <div class="text-muted ${activo === '0' ? 'text-alerta' : ''}">
                            ${activo === '1' ? 'Activo' : 'SE RETIRÓ'}
                        </div>
                        <div class="student-details">
                            <span class="badge badge-primary">Doc: ${documento}</span>
                           <!-- <span class="documento">Doc: ${documento}</span>-->
                        </div>
                    </div>
                `;
                estudiantesContainer.appendChild(studentDiv);
            });

            // Cargar materias relacionadas
            const materiasIds = new Set(
                alumnosMaterias
                    .filter(am => estudiantes.some(e => e[0] === am[1]))
                    .map(am => am[2])
            );
            
            materias.forEach(([id, nombre, desc]) => {
                if (materiasIds.has(id)) {
                    const option = document.createElement('option');
                    option.value = id;
                    option.textContent = nombre;
                    materiasSelect.appendChild(option);
                }
            });
            
            materiasSelect.disabled = false;
        }
    });

    document.getElementById('materias').addEventListener('change', (e) => {
        const idMateria = e.target.value;
        const notasContainer = document.getElementById('notas-container');
        const profesorContainer = document.getElementById('profesor-asignado'); // Nuevo contenedor
        const asistenciaContainer = document.getElementById('asistencia-container');
        const idInstitucion = document.getElementById('instituciones').value; 
        
        notasContainer.innerHTML = '';
        asistenciaContainer.innerHTML = '';
        profesorContainer.innerHTML = '';
    
        if (idMateria && idInstitucion) {
            // Obtener profesor asignado
            const relacionPM = profesoresMaterias.find(pm => 
                pm[2] === idMateria && // Filtra por materia
                pm[3] === idInstitucion // Filtra por institución
            );
            
            const profesor = profesores.find(p => 
                p[0] === (relacionPM ? relacionPM[1] : null) // Busca el profesor en la relación
            );
            const materiaSeleccionada = materias.find(m => m[0] === idMateria);
            const estudiantesInstitucion = alumnos.filter(a => a[4] === idInstitucion);
            
            // Mostrar información del profesor
            if (profesor) {
                profesorContainer.innerHTML = `
                    <div class="profesor-info">
                        <i class="fas fa-chalkboard-teacher"></i>
                        ${profesor[1]} ${profesor[2]}
                    </div>
                `;
            } else {
                profesorContainer.innerHTML = `
                    <div class="profesor-alerta">
                        <i class="fas fa-exclamation-triangle"></i>
                        No hay profesor asignado
                    </div>
                `;
            }
    
            // Crear tabla de notas
            const table = document.createElement('table');
            table.className = 'grades-table';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Estudiante</th>
                        <th>Calificación</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${notas
                        .filter(n => 
                            n[2] === idMateria && 
                            estudiantesInstitucion.some(e => e[0] === n[1]))
                        .map(([id, alumnoId, materiaId, profesorId, calificacion, fecha]) => {
                            const alumno = alumnos.find(a => a[0] === alumnoId);
                            const notaNumerica = parseFloat(calificacion);
                            const estado = notaNumerica < 3 ? 
                                '<span class="badge badge-danger">Bajo rendimiento</span>' : 
                                '<span class="badge badge-success">Aprobado</span>';
                            
                            return `
                                <tr class="${notaNumerica < 3 ? 'failing-grade' : ''}">
                                    <td>${alumno[1]}</td>
                                    <td>${notaNumerica.toFixed(1)}</td>
                                    <td>${estado}</td>
                                </tr>
                            `;
                        }).join('')}
                </tbody>
            `;
            notasContainer.appendChild(table);

            const tableAsistencia = document.createElement('table');
        tableAsistencia.className = 'attendance-table';
        tableAsistencia.innerHTML = `
            <thead>
                <tr>
                    <th>Estudiante</th>
                    <th>Fecha</th>
                    <th>Asistencia</th>
                    <th>% Asistencia</th>
                </tr>
            </thead>
            <tbody>
            ${alumnos
                .filter(alumno => (alumno[4] === idInstitucion &&(
                    notas.some(n => n[1] === alumno[0] && n[2] === idMateria) ||
                    asistencia.some(a => a[1] === alumno[0] && a[2] === idMateria)
                ))).sort((a, b) => new Date(a[3]) - new Date(b[3])) // Ordenar por fecha
                .map(alumno => {
                    const asistenciasAlumno = asistencia.filter(a => 
                        a[1] === alumno[0] && a[2] === idMateria &&
                        alumnos.some(al => al[0] === a[1] && al[4] === idInstitucion) // Validar institució
                    );
                    const totalClases = asistenciasAlumno.length;
                    const presentes = asistenciasAlumno.filter(a => a[4] === '1').length;
                    const porcentaje = totalClases > 0 
                        ? ((presentes / totalClases) * 100).toFixed(1)
                        : '0.0';

                    return `
                        <tr>
                            <td>${alumno[1]}</td>
                            <td>${asistenciasAlumno
                                .map(a => new Date(a[3]).toLocaleDateString('es-CO'
                                , {
                                    day: 'numeric',
                                    month: 'numeric',
                                    year: '2-digit'
                                }))
                                .join(' | ')}</td>
                            <td>
                                ${asistenciasAlumno.map(a => 
                                    a[4] === '1' 
                                        ? '<span class="presente-badge">✔</span>' 
                                        : '<span class="ausente-badge">✖</span>'
                                ).join(' ')}
                            </td>
                            <td>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${porcentaje}%">
                                        ${porcentaje}%
                                    </div>
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        `;
        asistenciaContainer.appendChild(tableAsistencia);
        }
    });
});