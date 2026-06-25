import json
import os
import re
import time
from pathlib import Path
from urllib.error import HTTPError
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from flask import Flask, jsonify, request
from flask_cors import CORS


app = Flask(__name__)
CORS(app)


def cargar_env_local():
    env_path = Path(__file__).with_name(".env")
    if not env_path.exists():
        return

    for linea in env_path.read_text(encoding="utf-8").splitlines():
        linea = linea.strip()
        if not linea or linea.startswith("#") or "=" not in linea:
            continue

        clave, valor = linea.split("=", 1)
        clave = clave.strip()
        valor = valor.strip().strip('"').strip("'")
        os.environ.setdefault(clave, valor)


cargar_env_local()


HTTP_TIMEOUT = 6
USER_AGENT = "logistic-pj-insurance-ai/1.0"
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_FALLBACK_MODELS = os.getenv("GEMINI_FALLBACK_MODELS", "gemini-2.5-flash")
GEMINI_RETRY_DELAYS = (2, 5)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "requiere_seguro": {"type": "boolean"},
        "nivel_riesgo": {
            "type": "string",
            "enum": ["muy bajo", "bajo", "medio", "alto"],
        },
        "puntaje_riesgo": {"type": "number"},
        "tipo_seguro_recomendado": {"type": "string"},
        "resumen_ia": {"type": "string"},
        "motivos_ia": {
            "type": "array",
            "items": {"type": "string"},
        },
        "acciones_recomendadas": {
            "type": "array",
            "items": {"type": "string"},
        },
        "confianza": {
            "type": "string",
            "enum": ["baja", "media", "alta"],
        },
    },
    "required": [
        "requiere_seguro",
        "nivel_riesgo",
        "puntaje_riesgo",
        "tipo_seguro_recomendado",
        "resumen_ia",
        "motivos_ia",
        "acciones_recomendadas",
        "confianza",
    ],
}


def obtener_json(url):
    req = Request(url, headers={"User-Agent": USER_AGENT})

    with urlopen(req, timeout=HTTP_TIMEOUT) as response:
        return json.loads(response.read().decode("utf-8"))


def post_json(url, payload, headers=None, timeout=HTTP_TIMEOUT):
    req = Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
            **(headers or {}),
        },
        method="POST",
    )

    if timeout is None:
        response_context = urlopen(req)
    else:
        response_context = urlopen(req, timeout=timeout)

    with response_context as response:
        return json.loads(response.read().decode("utf-8"))


def extraer_texto_gemini(data):
    textos = []

    for candidate in data.get("candidates", []):
        finish_reason = candidate.get("finishReason")
        if finish_reason:
            print(f"[Gemini] finishReason: {finish_reason}", flush=True)

        content = candidate.get("content") or {}
        for part in content.get("parts", []):
            text = part.get("text")
            if text:
                textos.append(text)

    return "\n".join(textos).strip()


def parsear_json_modelo(texto):
    if not texto:
        return None

    limpio = texto.strip()
    bloque = re.search(r"```(?:json)?\s*(.*?)\s*```", limpio, re.DOTALL)
    if bloque:
        limpio = bloque.group(1).strip()

    try:
        return json.loads(limpio)
    except json.JSONDecodeError:
        inicio = limpio.find("{")
        fin = limpio.rfind("}")
        if inicio != -1 and fin != -1 and fin > inicio:
            return json.loads(limpio[inicio : fin + 1])
        raise


def normalizar_recomendacion_ia(resultado):
    if not isinstance(resultado, dict):
        return None

    motivos = resultado.get("motivos_ia")
    acciones = resultado.get("acciones_recomendadas")
    puntaje = resultado.get("puntaje_riesgo")

    try:
        puntaje = max(0, min(100, float(puntaje)))
    except (TypeError, ValueError):
        puntaje = None

    return {
        "requiere_seguro": bool(resultado.get("requiere_seguro")),
        "nivel_riesgo": str(resultado.get("nivel_riesgo", "")).lower(),
        "puntaje_riesgo": puntaje,
        "tipo_seguro_recomendado": str(resultado.get("tipo_seguro_recomendado", "")),
        "resumen_ia": str(resultado.get("resumen_ia", "")),
        "motivos_ia": motivos if isinstance(motivos, list) else [],
        "acciones_recomendadas": acciones if isinstance(acciones, list) else [],
        "confianza": str(resultado.get("confianza", "media")).lower(),
    }


def numero_o_none(valor):
    if valor is None or str(valor).strip() == "":
        return None

    try:
        return float(valor)
    except (TypeError, ValueError):
        return None


def construir_prompt_gemini(operacion, analisis):
    contexto = {
        "operacion": operacion,
        "metricas_disponibles": analisis,
    }

    return (
        "Eres un asistente experto en gestion logistica y seguros de carga. "
        "Evalua la operacion usando solo los datos y metricas entregadas. "
        "Tu debes determinar toda la recomendacion: si requiere seguro, nivel de riesgo, "
        "puntaje de riesgo y tipo de seguro recomendado. No uses reglas externas fijas, "
        "no inventes datos externos ni precios. Devuelve exclusivamente JSON valido, "
        "sin markdown ni texto adicional. No incluyas saltos de linea dentro de strings. "
        "Estructura exacta: "
        "{"
        '"requiere_seguro": boolean, '
        '"nivel_riesgo": "muy bajo|bajo|medio|alto", '
        '"puntaje_riesgo": number, '
        '"tipo_seguro_recomendado": string, '
        '"resumen_ia": string, '
        '"motivos_ia": [string], '
        '"acciones_recomendadas": [string], '
        '"confianza": "baja|media|alta"'
        "}. "
        "El puntaje_riesgo debe estar entre 0 y 100 y debe ser decidido por tu analisis. "
        "La respuesta debe estar en espanol, ser breve y justificable para un sistema academico. "
        f"Datos: {json.dumps(contexto, ensure_ascii=False)}"
    )


def consultar_gemini(operacion, analisis):
    if not GEMINI_API_KEY:
        return None, "GEMINI_API_KEY no configurada"

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": construir_prompt_gemini(operacion, analisis)}],
            }
        ],
        "generationConfig": {
            "temperature": 0,
            "maxOutputTokens": 8192,
            "responseMimeType": "application/json",
        },
    }
    modelos = []
    for modelo in [GEMINI_MODEL, *GEMINI_FALLBACK_MODELS.split(",")]:
        modelo = modelo.strip()
        if modelo and modelo not in modelos:
            modelos.append(modelo)

    ultimo_error = None
    for modelo in modelos:
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{modelo}:generateContent"
        )

        for intento in range(len(GEMINI_RETRY_DELAYS) + 1):
            try:
                print(f"[Gemini] Consultando modelo {modelo}", flush=True)
                data = post_json(
                    url,
                    payload,
                    headers={"x-goog-api-key": GEMINI_API_KEY},
                    timeout=None,
                )
                texto = extraer_texto_gemini(data)
                break
            except HTTPError as error:
                detalle = error.read().decode("utf-8", errors="replace")
                ultimo_error = f"Gemini HTTP {error.code}"
                print(f"[Gemini] HTTP error: {detalle}", flush=True)

                if error.code not in {429, 500, 502, 503, 504}:
                    return None, ultimo_error

                if intento < len(GEMINI_RETRY_DELAYS):
                    espera = GEMINI_RETRY_DELAYS[intento]
                    print(f"[Gemini] Reintentando en {espera}s", flush=True)
                    time.sleep(espera)
                    continue

                print(f"[Gemini] Modelo {modelo} no disponible, probando fallback", flush=True)
                texto = None
                break
            except (OSError, URLError, TimeoutError, json.JSONDecodeError) as error:
                print(f"[Gemini] Error: {error}", flush=True)
                return None, str(error)

        if not texto:
            continue

        try:
            resultado = parsear_json_modelo(texto)
        except json.JSONDecodeError as error:
            print(f"[Gemini] JSON invalido: {texto[:1000]}", flush=True)
            return None, f"Gemini devolvio JSON invalido: {error}"

        resultado = normalizar_recomendacion_ia(resultado)
        if not resultado:
            return None, "Gemini no devolvio un objeto JSON"
        resultado["modelo_ia"] = modelo
        return resultado, None

    return None, ultimo_error or "Gemini no disponible"


def geocodificar_lugar(lugar):
    if not lugar:
        return None

    params = urlencode({
        "q": lugar,
        "format": "json",
        "limit": 1,
    })
    url = f"https://nominatim.openstreetmap.org/search?{params}"

    try:
        data = obtener_json(url)
    except (OSError, URLError, TimeoutError, json.JSONDecodeError) as error:
        print(f"[IA externa] Nominatim error para '{lugar}': {error}", flush=True)
        return None

    if not data:
        print(f"[IA externa] Nominatim sin resultados para '{lugar}'", flush=True)
        return None

    resultado = {
        "nombre": data[0].get("display_name", lugar),
        "lat": float(data[0]["lat"]),
        "lon": float(data[0]["lon"]),
    }
    print(f"[IA externa] Nominatim '{lugar}': {resultado}", flush=True)
    return resultado


def obtener_ruta_osrm(origen_geo, destino_geo):
    if not origen_geo or not destino_geo:
        return None

    coordenadas = (
        f"{origen_geo['lon']},{origen_geo['lat']};"
        f"{destino_geo['lon']},{destino_geo['lat']}"
    )
    url = (
        "https://router.project-osrm.org/route/v1/driving/"
        f"{coordenadas}?overview=false&alternatives=false&steps=false"
    )

    try:
        data = obtener_json(url)
    except (OSError, URLError, TimeoutError, json.JSONDecodeError) as error:
        print(f"[IA externa] OSRM error: {error}", flush=True)
        return None

    rutas = data.get("routes") or []
    if not rutas:
        print(f"[IA externa] OSRM sin rutas: {data}", flush=True)
        return None

    ruta = rutas[0]
    resultado = {
        "distancia_km": round(float(ruta.get("distance", 0)) / 1000, 2),
        "duracion_horas": round(float(ruta.get("duration", 0)) / 3600, 2),
    }
    print(f"[IA externa] OSRM ruta: {resultado}", flush=True)
    return resultado


def obtener_clima_open_meteo(geo):
    if not geo:
        return None

    params = urlencode({
        "latitude": geo["lat"],
        "longitude": geo["lon"],
        "current": "precipitation,rain,wind_speed_10m",
        "timezone": "auto",
    })
    url = f"https://api.open-meteo.com/v1/forecast?{params}"

    try:
        data = obtener_json(url)
    except (OSError, URLError, TimeoutError, json.JSONDecodeError) as error:
        print(f"[IA externa] Open-Meteo error para {geo.get('nombre')}: {error}", flush=True)
        return None

    current = data.get("current") or {}
    resultado = {
        "precipitacion_mm": float(current.get("precipitation", 0) or 0),
        "lluvia_mm": float(current.get("rain", 0) or 0),
        "viento_kmh": float(current.get("wind_speed_10m", 0) or 0),
    }
    print(f"[IA externa] Open-Meteo {geo.get('nombre')}: {resultado}", flush=True)
    return resultado


def evaluar_datos_externos(origen, destino):
    datos = {
        "origen": None,
        "destino": None,
        "ruta": None,
        "clima_origen": None,
        "clima_destino": None,
        "disponible": False,
    }

    print(f"[IA externa] Consultando APIs para ruta '{origen}' -> '{destino}'", flush=True)

    origen_geo = geocodificar_lugar(origen)
    destino_geo = geocodificar_lugar(destino)
    datos["origen"] = origen_geo
    datos["destino"] = destino_geo

    if not origen_geo or not destino_geo:
        print("[IA externa] No se pudo geocodificar origen o destino.", flush=True)
        return datos

    ruta = obtener_ruta_osrm(origen_geo, destino_geo)
    datos["ruta"] = ruta

    if ruta:
        datos["disponible"] = True

    clima_origen = obtener_clima_open_meteo(origen_geo)
    clima_destino = obtener_clima_open_meteo(destino_geo)
    datos["clima_origen"] = clima_origen
    datos["clima_destino"] = clima_destino

    for clima in [clima_origen, clima_destino]:
        if not clima:
            continue
        datos["disponible"] = True

    return datos


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "servicio": "Microservicio IA de recomendacion de seguros",
        "estado": "activo",
    })


@app.route("/api/recomendar-seguro", methods=["POST"])
def recomendar_seguro():
    data = request.get_json() or {}

    cantidad = data.get("cantidad")
    volumen = numero_o_none(data.get("volumen"))
    peso_suelto = numero_o_none(data.get("peso"))
    modalidad_carga = data.get("modalidad_carga") or "no_especificada"
    usa_contenedores = bool(data.get("usa_contenedores"))
    es_lcl = bool(data.get("lcl"))
    origen = str(data.get("origen", "")).lower()
    destino = str(data.get("destino", "")).lower()
    contenedores = data.get("contenedores", [])

    if not isinstance(contenedores, list):
        contenedores = []

    peso_total = 0

    for contenedor in contenedores:
        if not isinstance(contenedor, dict):
            continue

        peso_total += numero_o_none(contenedor.get("peso_bruto")) or 0

    if not contenedores:
        peso_total = peso_suelto or numero_o_none(data.get("peso_bruto")) or 0

    datos_externos = evaluar_datos_externos(origen, destino)

    metricas_usadas = [
        f"modalidad de carga: {modalidad_carga}",
        f"LCL: {'si' if es_lcl else 'no'}",
        f"usa contenedores: {'si' if usa_contenedores else 'no'}",
        f"peso total de la carga: {peso_total} kg",
        f"tipo de servicio: {data.get('tipo_servicio') or 'no especificado'}",
        f"tipo de nacionalizacion: {data.get('tipo_nacionalizacion') or 'no especificado'}",
        f"producto: {data.get('producto') or 'no especificado'}",
        f"origen: {data.get('origen') or 'no especificado'}",
        f"destino: {data.get('destino') or 'no especificado'}",
    ]

    if contenedores:
        metricas_usadas.append(f"contenedores asignados: {len(contenedores)}")
        for indice, contenedor in enumerate(contenedores, start=1):
            metricas_usadas.append(
                f"contenedor {indice}: numero {contenedor.get('numero_contenedor') or '-'}, "
                f"tipo {contenedor.get('tipo_contenedor') or '-'}, "
                f"naviera {contenedor.get('naviera') or '-'}, "
                f"peso bruto {contenedor.get('peso_bruto') or 0} kg"
            )
    else:
        metricas_usadas.append("contenedores asignados: no aplica o no registrado")

    if es_lcl:
        metricas_usadas.append(f"cantidad declarada: {cantidad or 'no especificada'}")

    if es_lcl:
        metricas_usadas.extend([
            f"volumen LCL: {volumen if volumen is not None else 'no especificado'}",
            f"peso LCL: {peso_suelto if peso_suelto is not None else 'no especificado'} kg",
        ])

    if data.get("nro_madre"):
        metricas_usadas.append(f"numero madre: {data.get('nro_madre')}")

    if data.get("nro_hijo"):
        metricas_usadas.append(f"numero hijo: {data.get('nro_hijo')}")

    if data.get("observacion"):
        metricas_usadas.append(f"observaciones de operacion: {data.get('observacion')}")

    if data.get("etd"):
        metricas_usadas.append(f"ETD: {data.get('etd')}")

    if data.get("eta"):
        metricas_usadas.append(f"ETA: {data.get('eta')}")

    ruta = datos_externos.get("ruta") or {}
    if ruta:
        metricas_usadas.extend([
            f"distancia estimada de ruta: {ruta.get('distancia_km')} km",
            f"duracion estimada de ruta: {ruta.get('duracion_horas')} horas",
        ])

    for etiqueta in ["clima_origen", "clima_destino"]:
        clima = datos_externos.get(etiqueta)
        if clima:
            metricas_usadas.append(
                f"{etiqueta}: precipitacion {clima.get('precipitacion_mm')} mm, "
                f"lluvia {clima.get('lluvia_mm')} mm, viento {clima.get('viento_kmh')} km/h"
            )

    analisis_base = {
        "modalidad_carga": modalidad_carga,
        "usa_contenedores": usa_contenedores,
        "lcl": es_lcl,
        "peso_total": peso_total,
        "cantidad_declarada": cantidad if es_lcl else None,
        "volumen": volumen,
        "peso_suelto": peso_suelto,
        "cantidad_contenedores": len(contenedores),
        "metricas_usadas": metricas_usadas,
        "datos_externos": datos_externos,
    }

    operacion = {
        "id_operacion": data.get("id_operacion"),
        "codigo_operacion": data.get("codigo_operacion"),
        "tipo_servicio": data.get("tipo_servicio"),
        "tipo_nacionalizacion": data.get("tipo_nacionalizacion"),
        "producto": data.get("producto"),
        "cantidad": cantidad if es_lcl else None,
        "volumen": volumen,
        "peso": peso_suelto,
        "modalidad_carga": modalidad_carga,
        "usa_contenedores": usa_contenedores,
        "lcl": es_lcl,
        "origen": data.get("origen"),
        "destino": data.get("destino"),
        "nro_madre": data.get("nro_madre"),
        "nro_hijo": data.get("nro_hijo"),
        "observacion": data.get("observacion"),
        "etd": data.get("etd"),
        "eta": data.get("eta"),
        "contenedores": contenedores,
    }

    recomendacion_ia, error_ia = consultar_gemini(operacion, analisis_base)

    if not recomendacion_ia:
        return jsonify({
            "error": "Gemini no pudo generar la recomendacion.",
            "detalle": error_ia,
            "fuente_recomendacion": "gemini",
            "modelo_ia": ", ".join([GEMINI_MODEL, GEMINI_FALLBACK_MODELS]),
            "metricas_enviadas": analisis_base,
        }), 503

    respuesta = {
        **analisis_base,
        "requiere_seguro": bool(recomendacion_ia.get("requiere_seguro")),
        "nivel_riesgo": recomendacion_ia.get("nivel_riesgo", ""),
        "puntaje_riesgo": recomendacion_ia.get("puntaje_riesgo"),
        "tipo_seguro_recomendado": recomendacion_ia.get("tipo_seguro_recomendado", ""),
        "resumen_ia": recomendacion_ia.get("resumen_ia", ""),
        "motivos_ia": recomendacion_ia.get("motivos_ia", []),
        "acciones_recomendadas": recomendacion_ia.get("acciones_recomendadas", []),
        "confianza": recomendacion_ia.get("confianza", "media"),
        "motivos": metricas_usadas,
        "fuente_recomendacion": "gemini",
        "modelo_ia": recomendacion_ia.get("modelo_ia", GEMINI_MODEL),
        "error_ia": None,
    }

    return jsonify(respuesta)


if __name__ == "__main__":
    app.run(port=5000, debug=True)
