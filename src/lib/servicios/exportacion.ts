import type { jsPDF } from 'jspdf';
import { NOMBRE_APLICACION, NOMBRE_SERVICIO, VERSION_ESQUEMA } from '../datos/constantes';
import type {
  OpcionesExportacionPdf,
  ResultadoAnalisis,
  ResumenAnalisis
} from '../datos/tipos';
import {
  abreviarId,
  descargarBlob,
  formatearCodigoTiempo,
  formatearDuracion,
  formatearFecha,
  formatearNumero,
  formatearSimilitud,
  formatearTamano,
  nombreArchivoSeguro
} from '../utilidades/formato';

const ADVERTENCIA =
  'La similitud acústica es una medida técnica de evidencia, no un dictamen legal ni una probabilidad de infracción.';

function celdaCsv(valor: string | number | boolean | null | undefined): string {
  if (valor === null || valor === undefined) return '';
  let texto = typeof valor === 'number'
    ? Number.isFinite(valor)
      ? valor.toFixed(4).replace('.', ',')
      : ''
    : String(valor);
  if (typeof valor === 'string' && /^[\s]*[=+\-@]/.test(texto)) texto = `'${texto}`;
  return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function filaCsv(valores: Array<string | number | boolean | null | undefined>): string {
  return valores.map(celdaCsv).join(';');
}

function nombreBase(resultado: ResultadoAnalisis): string {
  const limpio = nombreArchivoSeguro(resultado.nombreArchivo).replace(/\.[^.]+$/, '');
  return `${limpio}-${abreviarId(resultado.idAnalisis)}`;
}

export function construirCsvResultado(resultado: ResultadoAnalisis): string {
  const lineas: string[] = [];
  lineas.push(
    filaCsv([
      'Análisis',
      resultado.nombreArchivo,
      'ID',
      resultado.idAnalisis,
      'Fecha',
      formatearFecha(resultado.creadoEn)
    ])
  );
  lineas.push(filaCsv(['Advertencia', ADVERTENCIA]));
  lineas.push('');
  lineas.push(
    filaCsv([
      'N.º',
      'Canción de referencia',
      'Artista',
      'Inicio consulta (s)',
      'Fin consulta (s)',
      'Inicio referencia (s)',
      'Fin referencia (s)',
      'Duración (s)',
      'Similitud (0-1)',
      'Similitud mínima',
      'Similitud máxima',
      'Segmentos',
      'Desplazamiento alineación (s)',
      'Mejor tramo'
    ])
  );

  resultado.coincidencias.forEach((coincidencia, indice) => {
    lineas.push(
      filaCsv([
        indice + 1,
        coincidencia.titulo,
        coincidencia.artista,
        coincidencia.inicioConsulta,
        coincidencia.finConsulta,
        coincidencia.inicioFuente,
        coincidencia.finFuente,
        coincidencia.finConsulta - coincidencia.inicioConsulta,
        coincidencia.similitud,
        coincidencia.similitudMinima,
        coincidencia.similitudMaxima,
        coincidencia.cantidadSegmentos,
        coincidencia.desplazamientoAlineacion,
        coincidencia.esMejorTramo ? 'Sí' : 'No'
      ])
    );
  });

  if (resultado.coincidencias.length === 0) {
    lineas.push(filaCsv(['—', 'Sin coincidencias candidatas', '', '', '', '', '', '', '', '', '', '', '', '']));
  }

  return `\uFEFF${lineas.join('\r\n')}`;
}

export function exportarCsvResultado(resultado: ResultadoAnalisis): void {
  const contenido = construirCsvResultado(resultado);
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8' });
  descargarBlob(blob, `${nombreBase(resultado)}.csv`);
}

export function exportarCsvHistorial(analisis: ResumenAnalisis[]): void {
  const lineas: string[] = [];
  lineas.push(
    filaCsv([
      'N.º',
      'ID análisis',
      'Archivo',
      'Fecha',
      'Estado',
      'Coincidencias',
      'Canciones',
      'Mejor similitud (0-1)',
      'Segmento (s)',
      'Duración archivo (s)',
      'Tamaño (bytes)',
      'Formato'
    ])
  );
  analisis.forEach((item, indice) => {
    lineas.push(
      filaCsv([
        indice + 1,
        item.idAnalisis,
        item.nombreArchivo,
        item.creadoEn,
        item.estado,
        item.cantidadCoincidencias,
        item.cantidadCanciones,
        item.mejorSimilitud,
        item.segundosPorSegmento,
        item.duracionArchivoSegundos,
        item.tamanoBytes,
        item.formato
      ])
    );
  });
  const fecha = new Date().toISOString().slice(0, 10);
  descargarBlob(
    new Blob([`\uFEFF${lineas.join('\r\n')}`], { type: 'text/csv;charset=utf-8' }),
    `audiotrace-historial-${fecha}.csv`
  );
}

export function exportarJsonHistorial(analisis: ResumenAnalisis[]): void {
  const fecha = new Date().toISOString().slice(0, 10);
  descargarBlob(
    new Blob([JSON.stringify({ generadoEn: new Date().toISOString(), analisis }, null, 2)], {
      type: 'application/json;charset=utf-8'
    }),
    `audiotrace-historial-${fecha}.json`
  );
}

function encabezadoPdf(doc: jsPDF, resultado: ResultadoAnalisis): number {
  const ancho = doc.internal.pageSize.getWidth();
  doc.setFillColor(0, 103, 127);
  doc.rect(0, 0, ancho, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`${NOMBRE_APLICACION} · Reporte de similitud acústica`, 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `${NOMBRE_SERVICIO} · esquema ${VERSION_ESQUEMA} · generado ${formatearFecha(new Date().toISOString())}`,
    14,
    19
  );
  doc.text(`Archivo analizado: ${resultado.nombreArchivo}`, 14, 24);

  doc.setTextColor(25, 27, 37);
  return 38;
}

function cajaAdvertencia(doc: jsPDF, y: number): number {
  const ancho = doc.internal.pageSize.getWidth();
  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(245, 158, 11);
  doc.roundedRect(14, y, ancho - 28, 15, 2, 2, 'FD');
  doc.setTextColor(146, 64, 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Advertencia metodológica', 18, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(ADVERTENCIA, 18, y + 11, { maxWidth: ancho - 36 });
  doc.setTextColor(25, 27, 37);
  return y + 21;
}

export async function exportarPdfResultado(
  resultado: ResultadoAnalisis,
  opciones: OpcionesExportacionPdf
): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const ancho = doc.internal.pageSize.getWidth();
  let y = encabezadoPdf(doc, resultado);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(opciones.titulo || 'Resultados del cotejo acústico', 14, y);
  y += 7;

  if (opciones.incluirAdvertencia) {
    y = cajaAdvertencia(doc, y);
  }

  if (opciones.incluirMetadatos) {
    const metadatos = resultado.metadatos;
    autoTable(doc, {
      startY: y,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, lineColor: [225, 225, 239], lineWidth: 0.2 },
      headStyles: { fillColor: [237, 237, 251], textColor: [61, 72, 77], fontStyle: 'bold' },
      head: [['Metadatos del análisis', 'Valor']],
      body: [
        ['ID del análisis', resultado.idAnalisis],
        ['Archivo', resultado.nombreArchivo],
        ['Fecha de creación', formatearFecha(resultado.creadoEn)],
        ['Ventana de segmento', `${resultado.segundosPorSegmento} s`],
        ['Duración del archivo', metadatos?.duracionSegundos != null ? formatearDuracion(metadatos.duracionSegundos) : 'No disponible'],
        ['Tamaño', metadatos?.tamanoBytes ? formatearTamano(metadatos.tamanoBytes) : 'No disponible'],
        ['Formato', metadatos?.formato ?? 'No disponible'],
        ['Frecuencia de muestreo', metadatos?.frecuenciaMuestreo ? `${formatearNumero(metadatos.frecuenciaMuestreo)} Hz` : 'No disponible'],
        ['Canales', metadatos?.canales ? (metadatos.canales === 1 ? 'Mono' : 'Estéreo') : 'No disponible']
      ],
      columnStyles: { 0: { cellWidth: 52, fontStyle: 'bold' } },
      margin: { left: 14, right: 14 }
    });
    y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
    y += 6;
  }

  if (opciones.incluirResumen) {
    const canciones = new Set(resultado.coincidencias.map((item) => item.idCancion)).size;
    const mejor = resultado.coincidencias.length ? Math.max(...resultado.coincidencias.map((item) => item.similitud)) : null;
    const tramos = resultado.coincidencias.map((item) => [item.inicioConsulta, item.finConsulta]).sort((a, b) => a[0] - b[0]);
    let cubierto = 0;
    let finCubierto = 0;
    for (const [inicio, fin] of tramos) {
      cubierto += Math.max(0, fin - Math.max(inicio, finCubierto));
      finCubierto = Math.max(finCubierto, fin);
    }
    autoTable(doc, {
      startY: y,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, lineColor: [225, 225, 239], lineWidth: 0.2 },
      headStyles: { fillColor: [237, 237, 251], textColor: [61, 72, 77], fontStyle: 'bold' },
      head: [['Resumen', 'Valor']],
      body: [
        ['Coincidencias candidatas', String(resultado.coincidencias.length)],
        ['Canciones de referencia', String(canciones)],
        ['Mejor similitud', formatearSimilitud(mejor, 2)],
        ['Material cubierto', `${formatearDuracion(cubierto)} (unión de intervalos)`],
        ['Criterio', 'Distancia vectorial MFCC · índice HNSW · runs alineados']
      ],
      columnStyles: { 0: { cellWidth: 52, fontStyle: 'bold' } },
      margin: { left: 14, right: 14 }
    });
    y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
    y += 6;
  }

  if (opciones.incluirCoincidencias && resultado.coincidencias.length > 0) {
    const filas = resultado.coincidencias.map((item) => [
      item.titulo,
      item.artista,
      `${formatearCodigoTiempo(item.inicioConsulta)} – ${formatearCodigoTiempo(item.finConsulta)}`,
      `${formatearCodigoTiempo(item.inicioFuente)} – ${formatearCodigoTiempo(item.finFuente)}`,
      formatearSimilitud(item.similitud, 2),
      String(item.cantidadSegmentos),
      item.esMejorTramo ? 'Sí' : 'No'
    ]);

    autoTable(doc, {
      startY: y,
      theme: 'striped',
      styles: { fontSize: 7.2, cellPadding: 1.8, lineColor: [225, 225, 239], lineWidth: 0.15 },
      headStyles: { fillColor: [12, 166, 202], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [243, 242, 255] },
      head: [['Canción', 'Artista', 'Tramo consultado', 'Tramo en referencia', 'Similitud', 'Seg.', 'Mejor']],
      body: filas,
      columnStyles: {
        0: { cellWidth: 38 },
        1: { cellWidth: 34 },
        2: { cellWidth: 33 },
        3: { cellWidth: 33 },
        4: { cellWidth: 17, halign: 'right' },
        5: { cellWidth: 10, halign: 'right' },
        6: { cellWidth: 10, halign: 'center' }
      },
      margin: { left: 14, right: 14 },
      didDrawPage: () => {
        const alto = doc.internal.pageSize.getHeight();
        doc.setFontSize(7);
        doc.setTextColor(109, 121, 126);
        doc.text(
          `${NOMBRE_APLICACION} · ${ADVERTENCIA}`,
          14,
          alto - 8,
          { maxWidth: ancho - 28 }
        );
        doc.text(
          `Página ${doc.getNumberOfPages()}`,
          ancho - 14,
          alto - 8,
          { align: 'right' }
        );
      }
    });
  }

  doc.save(`${nombreBase(resultado)}-reporte.pdf`);
}
