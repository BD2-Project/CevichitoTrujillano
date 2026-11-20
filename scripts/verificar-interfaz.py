"""QA local: navegador real contra contrato HTTP controlado y demo, sin tocar SoupDB."""
import io
import json
import math
import os
from pathlib import Path
import struct
import subprocess
import threading
import time
import urllib.request
import wave
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

RAIZ = Path(__file__).resolve().parents[1]
SALIDA = RAIZ / '.verificacion'
SALIDA.mkdir(exist_ok=True)
DESCARGAS = SALIDA / f'descargas-{time.time_ns()}'
DESCARGAS.mkdir()
ID = 'a' * 32
COINCIDENCIA = dict(query_start=0, query_end=5, song_id=1, title='Referencia de prueba', artist='Prueba técnica', source_start=0, source_end=5, score=.83, segment_count=1, min_score=.83, max_score=.83, alignment_offset_seconds=0, is_best_run=True)
RESULTADO = dict(analysis_id=ID, filename='muestra.wav', created_at='2026-11-17T12:00:00.000000Z', segment_seconds=5, matches=[COINCIDENCIA])
CANCION = dict(song_id=1, title='Referencia de prueba', artist='Prueba técnica', duration_seconds=6, segment_count=1, audio_url='/api/v1/catalog/1/audio?version=1')
RESUMEN = dict(analysis_id=ID, filename='muestra.wav', created_at=RESULTADO['created_at'], segment_seconds=5, match_count=1, song_count=1, best_score=.83)
audio = io.BytesIO()
with wave.open(audio, 'wb') as archivo:
    archivo.setparams((1, 2, 16000, 0, 'NONE', 'not compressed'))
    archivo.writeframes(b''.join(struct.pack('<h', int(4000 * math.sin(i * 2 * math.pi * 440 / 16000))) for i in range(96000)))
AUDIO = audio.getvalue()
(SALIDA / 'muestra.wav').write_bytes(AUDIO)
peticiones = []

class Contrato(BaseHTTPRequestHandler):
    def log_message(self, *_): pass
    def responder(self, estado, datos, tipo='application/json'):
        cuerpo = datos if isinstance(datos, bytes) else json.dumps(datos).encode()
        self.send_response(estado)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Type', tipo)
        self.send_header('Content-Length', str(len(cuerpo)))
        self.end_headers()
        self.wfile.write(cuerpo)
    def do_GET(self):
        peticiones.append(self.path)
        if self.path == '/api/v1/catalog': self.responder(200, dict(catalog_mutable=False, song_count=1, segment_count=1, songs=[CANCION]))
        elif self.path == '/api/v1/catalog/1': self.responder(200, dict(**CANCION, segments=[dict(segment_id=1, segment_index=0, start_seconds=0, end_seconds=5)]))
        elif self.path == CANCION['audio_url']: self.responder(200, AUDIO, 'audio/wav')
        elif self.path == '/api/v1/analyses': self.responder(200, [RESUMEN])
        elif self.path == f'/api/v1/analyses/{ID}': self.responder(200, RESULTADO)
        else: self.responder(404, dict(detail='No encontrado.'))
    def do_POST(self):
        cuerpo = self.rfile.read(int(self.headers.get('Content-Length', 0)))
        peticiones.append(self.path)
        if self.path != '/api/v1/analyze': return self.responder(404, dict(detail='No encontrado.'))
        assert b'name="file"' in cuerpo
        for codigo in (422, 503, 500):
            if f'error-{codigo}.wav'.encode() in cuerpo:
                return self.responder(codigo, dict(detail=f'Fallo HTTP {codigo} de prueba.'))
        time.sleep(.5)
        self.responder(200, RESULTADO)

servidor = ThreadingHTTPServer(('127.0.0.1', 8765), Contrato)
threading.Thread(target=servidor.serve_forever, daemon=True).start()
procesos = []
navegador = None
resultados = []

def verificar(nombre, condicion):
    assert condicion, nombre
    resultados.append(nombre)
    print('OK:', nombre, flush=True)

def iniciar(puerto, modo):
    entorno = dict(os.environ, VITE_MODO_CLIENTE=modo, VITE_URL_API='http://127.0.0.1:8765')
    registro = open(SALIDA / f'vite-{modo}.log', 'w', encoding='utf8')
    proceso = subprocess.Popen(['node', 'node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', str(puerto)], cwd=RAIZ, env=entorno, stdout=registro, stderr=registro, creationflags=subprocess.CREATE_NO_WINDOW)
    procesos.append((proceso, registro))
    for _ in range(60):
        try:
            urllib.request.urlopen(f'http://127.0.0.1:{puerto}', timeout=1)
            return
        except Exception: time.sleep(.2)
    raise RuntimeError('Vite no inició')

try:
    iniciar(5174, 'rest')
    iniciar(5175, 'demo')
    opciones = webdriver.ChromeOptions()
    opciones.add_argument('--headless=new')
    opciones.add_argument('--window-size=1440,1100')
    opciones.add_argument('--autoplay-policy=no-user-gesture-required')
    opciones.add_argument('--no-first-run')
    opciones.add_experimental_option('prefs', {'download.default_directory': str(DESCARGAS), 'download.prompt_for_download': False, 'profile.default_content_setting_values.automatic_downloads': 1})
    opciones.set_capability('goog:loggingPrefs', {'browser': 'ALL'})
    controladores = list((Path.home() / '.cache/selenium/chromedriver/win64').glob('*/chromedriver.exe'))
    ruta_driver = max(controladores, key=lambda ruta: tuple(int(parte) for parte in ruta.parent.name.split('.'))) if controladores else None
    servicio = Service(executable_path=str(ruta_driver)) if ruta_driver else Service()
    servicio.creation_flags = subprocess.CREATE_NO_WINDOW
    navegador = webdriver.Chrome(service=servicio, options=opciones)
    navegador.execute_cdp_cmd('Browser.setDownloadBehavior', {'behavior': 'allow', 'downloadPath': str(DESCARGAS)})
    espera = WebDriverWait(navegador, 20)
    def js(codigo): return navegador.execute_script(codigo)
    def asincrono(codigo):
        return navegador.execute_async_script('const fin=arguments[arguments.length-1]; (async()=>{' + codigo + '})().then(fin).catch(e=>fin({fallo:String(e)}));')
    def ruta(hash):
        navegador.execute_script('location.hash=arguments[0]', hash)
        time.sleep(.35)
    navegador.get('http://127.0.0.1:5174')
    espera.until(lambda _: 'Nuevo análisis' in navegador.find_element(By.TAG_NAME, 'body').text)
    espera.until(lambda _: asincrono("const {app}=await import('/src/lib/estado/aplicacion.svelte.ts'); return app.catalogo.length;") == 1)
    verificar('REST: catálogo e historial reales sin fallback', asincrono("const {app}=await import('/src/lib/estado/aplicacion.svelte.ts'); return app.analisis.length===1 && app.estadoConexion.modo==='rest' && app.estadoConexion.conectado;") is True)
    navegador.save_screenshot(str(SALIDA / 'nuevo.png'))
    ruta('/catalogo')
    verificar('REST: catálogo de solo lectura', 'solo lectura' in navegador.find_element(By.TAG_NAME, 'body').text.lower())
    navegador.save_screenshot(str(SALIDA / 'catalogo.png'))
    ruta('/resultados/' + ID)
    espera.until(lambda _: len(navegador.find_elements(By.CSS_SELECTOR, '[role="tab"]')) == 3)
    navegador.find_element(By.ID, 'pestana-comparacion').click()
    espera.until(lambda _: len(navegador.find_elements(By.CSS_SELECTOR, 'audio[src]')) > 0)
    espera.until(lambda _: js("return document.querySelector('audio[src]')?.readyState>=2"))
    verificar('REST: reproducción HTMLAudio real', asincrono("const a=document.querySelector('audio[src]'); await a.play(); await new Promise(r=>setTimeout(r,250)); return !a.paused && a.currentTime>0;") is True)
    navegador.find_element(By.ID, 'pestana-metadatos').click()
    verificar('Resultados: tabs funcionales', navegador.find_element(By.ID, 'pestana-metadatos').get_attribute('aria-selected') == 'true')
    navegador.find_element(By.ID, 'pestana-coincidencias').click()
    navegador.save_screenshot(str(SALIDA / 'resultados.png'))
    ruta('/resultados/' + ID + '?modal=exportar')
    espera.until(lambda _: len(navegador.find_elements(By.CSS_SELECTOR, '[role="dialog"]')) == 1)
    for _ in range(18): navegador.switch_to.active_element.send_keys('\ue004')
    verificar('Modal: foco permanece dentro', js("return !!document.activeElement.closest('[role=dialog]')"))
    pdf_antes = len(list(DESCARGAS.glob('*.pdf')))
    botones = navegador.find_elements(By.CSS_SELECTOR, '[role="dialog"] button')
    next(b for b in botones if b.text.strip().endswith('Exportar PDF')).click()
    espera.until(lambda _: len(list(DESCARGAS.glob('*.pdf'))) > pdf_antes)
    pdf = next(DESCARGAS.glob('*.pdf')).read_bytes()
    verificar('PDF: descarga real con firma válida', pdf.startswith(b'%PDF') and len(pdf) > 1000)
    ruta('/resultados/' + ID)
    ruta('/resultados/' + ID + '?modal=exportar')
    espera.until(lambda _: len(navegador.find_elements(By.CSS_SELECTOR, '[role="dialog"]')) == 1)
    navegador.execute_script("document.querySelector('input[name=\"formato-exportacion\"][value=\"csv\"]').click()")
    next(b for b in navegador.find_elements(By.CSS_SELECTOR, '[role="dialog"] button') if b.text.strip().endswith('Exportar CSV')).click()
    espera.until(lambda _: len(list(DESCARGAS.glob('*.csv'))) > 0)
    verificar('CSV: contenido y advertencia', 'Similitud (0-1)' in next(DESCARGAS.glob('*.csv')).read_text(encoding='utf-8-sig'))
    navegador.get('http://127.0.0.1:5174/#/resultados/' + ID + '?modal=exportar')
    espera.until(lambda _: any(b.text.strip().endswith('Exportar PDF') and b.is_enabled() for b in navegador.find_elements(By.TAG_NAME, 'button')))
    verificar('Exportación directa: carga concurrente del expediente', 'Expediente no disponible' not in navegador.find_element(By.TAG_NAME, 'body').text)
    ruta('/resultados/%')
    verificar('Ruta malformada: recuperación sin excepción', 'no encontrada' in navegador.find_element(By.TAG_NAME, 'body').text.lower())
    ruta('/nuevo')
    navegador.find_element(By.CSS_SELECTOR, 'input[type=file]').send_keys(str(SALIDA / 'muestra.wav'))
    espera.until(lambda _: asincrono("const {app}=await import('/src/lib/estado/aplicacion.svelte.ts'); return app.archivo?.name;") == 'muestra.wav')
    consultas_previas = peticiones.count(f'/api/v1/analyses/{ID}')
    verificar('REST: multipart y resultado del servidor', asincrono("const {app}=await import('/src/lib/estado/aplicacion.svelte.ts'); await app.iniciarAnalisis(); return app.resultadoActual?.idAnalisis==='" + ID + "';") is True)
    verificar('REST: resultado persistido sin segunda consulta', peticiones.count(f'/api/v1/analyses/{ID}') == consultas_previas and asincrono("const {app}=await import('/src/lib/estado/aplicacion.svelte.ts'); return app.resultadoActual?.creadoEn;") == '2026-11-17T12:00:00.000Z')
    for codigo in (422, 503, 500):
        valor = asincrono("const {app}=await import('/src/lib/estado/aplicacion.svelte.ts'); const b=await (await fetch('/src/../index.html')).blob(); await app.seleccionarArchivo(new File([b], 'error-" + str(codigo) + ".wav', {type:'audio/wav'})); await app.iniciarAnalisis(); return app.errorActual?.codigo;")
        verificar(f'REST: HTTP {codigo} llega a la pantalla de error', valor == str(codigo))
    navegador.save_screenshot(str(SALIDA / 'error.png'))
    navegador.set_window_size(390, 844)
    navegador.execute_cdp_cmd('Emulation.setDeviceMetricsOverride', {'width': 390, 'height': 844, 'deviceScaleFactor': 1, 'mobile': True})
    asincrono("const {app}=await import('/src/lib/estado/aplicacion.svelte.ts'); app.notificaciones=[]; return true;")
    for pagina in ('/nuevo', '/catalogo', '/historial', '/resultados/' + ID, '/error/422'):
        ruta(pagina)
        if js('return document.documentElement.scrollWidth > innerWidth + 1'):
            navegador.save_screenshot(str(SALIDA / 'desborde.png'))
            print(js("return [...document.querySelectorAll('main *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,12).map(e=>({tag:e.tagName,clase:e.className,ancho:e.getBoundingClientRect().width,texto:e.innerText?.slice(0,60)}))"), flush=True)
        verificar('Móvil sin desborde: ' + pagina, js('return document.documentElement.scrollWidth <= innerWidth + 1'))
    navegador.set_window_size(1440, 1100)
    navegador.execute_cdp_cmd('Emulation.clearDeviceMetricsOverride', {})
    navegador.get('http://127.0.0.1:5175')
    espera.until(lambda _: asincrono("const {app}=await import('/src/lib/estado/aplicacion.svelte.ts'); return app.catalogo.length;") == 80)
    verificar('Demo: 80 canciones / 480 segmentos', asincrono("const {app}=await import('/src/lib/estado/aplicacion.svelte.ts'); return app.totalSegmentosCatalogo===480 && app.analisis.length===14;") is True)
    ruta('/historial')
    campo = navegador.find_element(By.ID, 'filtro-busqueda')
    campo.send_keys('ningun-archivo-existe-qa')
    espera.until(lambda _: 'No hay análisis con estos filtros' in navegador.find_element(By.TAG_NAME, 'body').text)
    verificar('Historial: filtro funcional y estado vacío', True)
    campo.clear()
    campo.send_keys(' ')
    ruta('/nuevo')
    verificar('Demo: pipeline simulado completa y navega', asincrono("const {app}=await import('/src/lib/estado/aplicacion.svelte.ts'); const datos=new Uint8Array(" + json.dumps(list(AUDIO[:44])) + "); await app.seleccionarArchivo(new File([datos, new Uint8Array(192000)],'muestra-demo.wav',{type:'audio/wav'})); await app.iniciarAnalisis(); return !!app.resultadoActual && !app.trabajoActivo && location.hash.startsWith('#/resultados/');") is True)
    verificar('Demo: alta e importación funcionales', asincrono("const {app}=await import('/src/lib/estado/aplicacion.svelte.ts'); const r={titulo:'Nueva prueba',artista:'QA',anio:2026,genero:'Prueba',coleccion:'Prueba',duracionSegundos:10,rutaAudio:'prueba.wav'}; await app.agregarReferencia(r); await app.importarDataset([{...r,titulo:'Importada',rutaAudio:'otra.wav'}]); return app.catalogo.length===82;") is True)
    ruta('/catalogo?modal=importar')
    espera.until(lambda _: len(navegador.find_elements(By.CSS_SELECTOR, '[role="dialog"]')) == 1)
    navegador.save_screenshot(str(SALIDA / 'importar.png'))
    errores = [e for e in navegador.get_log('browser') if 'Uncaught' in e['message'] or 'svelte' in e['message'].lower() and e['level']=='SEVERE']
    verificar('Navegador sin excepciones JavaScript', not errores)
    (SALIDA / 'resultado.json').write_text(json.dumps(dict(verificaciones=resultados, peticiones=peticiones, errores=errores), ensure_ascii=False, indent=2), encoding='utf8')
finally:
    if navegador: navegador.quit()
    servidor.shutdown()
    for proceso, registro in procesos:
        proceso.terminate()
        proceso.wait(timeout=10)
        registro.close()
