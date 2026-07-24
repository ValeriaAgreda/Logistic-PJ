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
GEMINI_TEMPERATURE = max(0.0, min(2.0, float(os.getenv("GEMINI_TEMPERATURE", "0"))))
GEMINI_SEED = int(os.getenv("GEMINI_SEED", "42"))
GEMINI_MAX_OUTPUT_TOKENS = int(os.getenv("GEMINI_MAX_OUTPUT_TOKENS", "8192"))
GEMINI_THINKING_BUDGET = int(os.getenv("GEMINI_THINKING_BUDGET", "1024"))
GEMINI_PROMPT_VERSION = "seguros-v3-catalogo"
CATALOGO_SEGUROS = {
    "ICC_A": {
        "nombre": "Carga con cobertura amplia - ICC (A)",
        "descripcion": (
            "Cobertura amplia para carga con exposicion alta, mercancia fragil o valiosa, "
            "trayectos largos o transporte multimodal complejo."
        ),
    },
    "ICC_B": {
        "nombre": "Carga con cobertura intermedia - ICC (B)",
        "descripcion": (
            "Cobertura intermedia de riesgos especificados para operaciones con exposicion moderada."
        ),
    },
    "ICC_C": {
        "nombre": "Carga con cobertura basica - ICC (C)",
        "descripcion": (
            "Cobertura basica de riesgos especificados para mercancia ordinaria y exposicion menor."
        ),
    },
    "CARGA_REFRIGERADA": {
        "nombre": "Cobertura especializada para carga refrigerada",
        "descripcion": (
            "Proteccion especializada para productos perecederos o sensibles a variaciones de temperatura."
        ),
    },
    "MAQUINARIA_EQUIPOS": {
        "nombre": "Cobertura especializada para maquinaria y equipos",
        "descripcion": (
            "Proteccion para maquinaria, equipos industriales y componentes que requieren manejo especial."
        ),
    },
    "RESPONSABILIDAD_TRANSPORTADOR": {
        "nombre": "Responsabilidad civil del transportador",
        "descripcion": (
            "Cobertura de la responsabilidad del transportador frente a daños a la carga; "
            "no sustituye el seguro directo del propietario de la mercancia."
        ),
    },
    "NO_DETERMINABLE": {
        "nombre": "Cobertura no determinable con los datos disponibles",
        "descripcion": (
            "Se usa cuando faltan datos esenciales y no es responsable seleccionar una cobertura concreta."
        ),
    },
}
COBERTURAS_ADICIONALES = {
    "ROBO_HURTO": "Robo, hurto y falta de entrega",
    "HUMEDAD_OXIDACION": "Humedad, mojadura u oxidacion",
    "DANOS_MANIPULACION": "Danos durante carga, descarga y manipulacion",
    "PUERTA_A_PUERTA": "Extension puerta a puerta",
    "GUERRA_HUELGAS": "Guerra, huelgas y conmocion civil",
    "TEMPERATURA": "Variacion de temperatura o falla de refrigeracion",
    "NINGUNA": "Sin cobertura adicional sugerida",
}
GEMINI_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "requiere_seguro": {"type": "boolean"},
        "nivel_riesgo": {
            "type": "string",
            "enum": ["muy bajo", "bajo", "medio", "alto"],
        },
        "puntaje_riesgo": {"type": "number", "minimum": 0, "maximum": 100},
        "codigo_seguro_recomendado": {
            "type": "string",
            "enum": list(CATALOGO_SEGUROS),
        },
        "coberturas_adicionales": {
            "type": "array",
            "items": {
                "type": "string",
                "enum": list(COBERTURAS_ADICIONALES),
            },
            "maxItems": 4,
        },
        "resumen_ia": {"type": "string"},
        "motivos_ia": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 1,
            "maxItems": 5,
        },
        "acciones_recomendadas": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 1,
            "maxItems": 5,
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
        "codigo_seguro_recomendado",
        "coberturas_adicionales",
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
    codigo_seguro = resultado.get("codigo_seguro_recomendado")
    seguro = CATALOGO_SEGUROS.get(codigo_seguro, CATALOGO_SEGUROS["NO_DETERMINABLE"])
    codigos_coberturas = resultado.get("coberturas_adicionales") or []

    try:
        puntaje = max(0, min(100, float(puntaje)))
    except (TypeError, ValueError):
        puntaje = None

    return {
        "requiere_seguro": bool(resultado.get("requiere_seguro")),
        "nivel_riesgo": str(resultado.get("nivel_riesgo", "")).lower(),
        "puntaje_riesgo": puntaje,
        "codigo_seguro_recomendado": codigo_seguro,
        "tipo_seguro_recomendado": seguro["nombre"],
        "coberturas_adicionales": [
            {
                "codigo": codigo,
                "nombre": COBERTURAS_ADICIONALES[codigo],
            }
            for codigo in codigos_coberturas
            if codigo in COBERTURAS_ADICIONALES
        ],
        "resumen_ia": str(resultado.get("resumen_ia", "")),
        "motivos_ia": motivos if isinstance(motivos, list) else [],
        "acciones_recomendadas": acciones if isinstance(acciones, list) else [],
        "confianza": str(resultado.get("confianza", "media")).lower(),
    }


def validar_recomendacion_ia(resultado):
    if not isinstance(resultado, dict):
        return False

    campos_esperados = set(GEMINI_RESPONSE_SCHEMA["required"])
    if set(resultado) != campos_esperados:
        return False

    if not isinstance(resultado.get("requiere_seguro"), bool):
        return False

    if resultado.get("nivel_riesgo") not in {"muy bajo", "bajo", "medio", "alto"}:
        return False

    puntaje = resultado.get("puntaje_riesgo")
    if isinstance(puntaje, bool) or not isinstance(puntaje, (int, float)):
        return False
    if not 0 <= puntaje <= 100:
        return False

    if resultado.get("confianza") not in {"baja", "media", "alta"}:
        return False

    codigo_seguro = resultado.get("codigo_seguro_recomendado")
    if codigo_seguro not in CATALOGO_SEGUROS:
        return False

    coberturas = resultado.get("coberturas_adicionales")
    if not isinstance(coberturas, list) or len(coberturas) > 4:
        return False
    if any(codigo not in COBERTURAS_ADICIONALES for codigo in coberturas):
        return False
    if "NINGUNA" in coberturas and len(coberturas) != 1:
        return False

    if not isinstance(resultado.get("resumen_ia"), str) or not resultado["resumen_ia"].strip():
        return False

    for campo in ("motivos_ia", "acciones_recomendadas"):
        valores = resultado.get(campo)
        if not isinstance(valores, list) or not valores:
            return False
        if not all(isinstance(valor, str) and valor.strip() for valor in valores):
            return False

    return True


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
        "catalogo_seguros_permitido": CATALOGO_SEGUROS,
        "coberturas_adicionales_permitidas": COBERTURAS_ADICIONALES,
    }

    return (
        "Eres un sistema de inteligencia artificial especializado en evaluar riesgos "
        "de operaciones logisticas y recomendar seguros de carga. Evalua cada operacion "
        "individualmente usando solo los datos y metricas entregadas. Tu debes determinar "
        "toda la recomendacion: si requiere seguro, nivel de riesgo, puntaje de riesgo y "
        "codigo de seguro recomendado. La decision final debe ser realizada por ti, no debes "
        "copiar una respuesta generica ni asumir que todas las operaciones tienen el mismo riesgo. "
        "Analiza como minimo los datos disponibles sobre producto, peso, volumen, cantidad, "
        "modalidad de carga, contenedores, carga LCL o FCL, Incoterm, origen, destino, distancia, duracion, "
        "clima, fechas, observaciones y datos faltantes. Compara conjuntamente los factores: "
        "una diferencia relevante debe reflejarse de forma razonada en el puntaje, nivel, motivos "
        "o codigo de seguro. Selecciona exactamente una opcion del catalogo entregado y no inventes "
        "nombres de polizas. No busques variedad artificial: elige la opcion que mejor corresponda "
        "a los datos. No inventes datos externos, valores de mercancia, coberturas disponibles "
        "ni precios. Si faltan datos importantes, indicalo en los motivos y reduce la confianza. "
        "Devuelve exclusivamente JSON valido, "
        "sin markdown ni texto adicional. No incluyas saltos de linea dentro de strings. "
        "Estructura exacta: "
        "{"
        '"requiere_seguro": boolean, '
        '"nivel_riesgo": "muy bajo|bajo|medio|alto", '
        '"puntaje_riesgo": number, '
        '"codigo_seguro_recomendado": "ICC_A|ICC_B|ICC_C|CARGA_REFRIGERADA|'
        'MAQUINARIA_EQUIPOS|RESPONSABILIDAD_TRANSPORTADOR|NO_DETERMINABLE", '
        '"coberturas_adicionales": ["ROBO_HURTO|HUMEDAD_OXIDACION|DANOS_MANIPULACION|'
        'PUERTA_A_PUERTA|GUERRA_HUELGAS|TEMPERATURA|NINGUNA"], '
        '"resumen_ia": string, '
        '"motivos_ia": [string], '
        '"acciones_recomendadas": [string], '
        '"confianza": "baja|media|alta"'
        "}. "
        "El puntaje_riesgo debe estar entre 0 y 100 y debe ser decidido por tu analisis. "
        "Usa NO_DETERMINABLE cuando falten datos esenciales para elegir responsablemente. "
        "Usa NINGUNA como unica cobertura adicional cuando no corresponda sugerir otra. "
        "El nivel, el puntaje, la necesidad de seguro y el codigo recomendado deben ser coherentes "
        "entre si y estar sustentados por motivos vinculados a los datos de esta operacion. "
        "La respuesta debe estar en espanol, ser breve, especifica y justificable para un sistema academico. "
        f"Datos: {json.dumps(contexto, ensure_ascii=False)}"
    )


def obtener_configuracion_generacion():
    return {
        "prompt_version": GEMINI_PROMPT_VERSION,
        "temperature": GEMINI_TEMPERATURE,
        "seed": GEMINI_SEED,
        "candidate_count": 1,
        "max_output_tokens": GEMINI_MAX_OUTPUT_TOKENS,
        "thinking_budget": GEMINI_THINKING_BUDGET,
    }


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
            "temperature": GEMINI_TEMPERATURE,
            "seed": GEMINI_SEED,
            "candidateCount": 1,
            "maxOutputTokens": GEMINI_MAX_OUTPUT_TOKENS,
            "thinkingConfig": {
                "thinkingBudget": GEMINI_THINKING_BUDGET,
            },
            "responseMimeType": "application/json",
            "responseSchema": GEMINI_RESPONSE_SCHEMA,
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

        if not validar_recomendacion_ia(resultado):
            print(f"[Gemini] Respuesta fuera del esquema esperado: {resultado}", flush=True)
            return None, "Gemini devolvio una recomendacion incompleta o fuera del esquema"

        resultado = normalizar_recomendacion_ia(resultado)
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


def evaluar_datos_externos(origen, destino, tipo_servicio):
    servicio = str(tipo_servicio or "").strip().lower().replace("í", "i")
    permite_ruta_terrestre = servicio == "terrestre"
    datos = {
        "origen": None,
        "destino": None,
        "ruta": None,
        "ruta_aplicable": permite_ruta_terrestre,
        "nota_ruta": None,
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

    if permite_ruta_terrestre:
        ruta = obtener_ruta_osrm(origen_geo, destino_geo)
        datos["ruta"] = ruta

        if ruta:
            datos["disponible"] = True
    else:
        datos["nota_ruta"] = (
            "OSRM no se uso porque solo calcula rutas terrestres y no representa "
            f"correctamente un servicio {tipo_servicio or 'no especificado'}."
        )
        print(f"[IA externa] {datos['nota_ruta']}", flush=True)

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

    datos_externos = evaluar_datos_externos(origen, destino, data.get("tipo_servicio"))

    metricas_usadas = [
        f"modalidad de carga: {modalidad_carga}",
        f"LCL: {'si' if es_lcl else 'no'}",
        f"usa contenedores: {'si' if usa_contenedores else 'no'}",
        f"peso total de la carga: {peso_total} kg",
        f"tipo de servicio: {data.get('tipo_servicio') or 'no especificado'}",
        f"tipo de nacionalizacion: {data.get('tipo_nacionalizacion') or 'no especificado'}",
        f"Incoterm: {data.get('incoterm') or 'no especificado'}",
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
            f"distancia terrestre estimada por OSRM: {ruta.get('distancia_km')} km",
            f"duracion terrestre estimada por OSRM: {ruta.get('duracion_horas')} horas",
        ])
    elif datos_externos.get("nota_ruta"):
        metricas_usadas.append(datos_externos["nota_ruta"])

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
        "incoterm": data.get("incoterm"),
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
            "configuracion_generacion": obtener_configuracion_generacion(),
            "metricas_enviadas": analisis_base,
        }), 503

    respuesta = {
        **analisis_base,
        "requiere_seguro": bool(recomendacion_ia.get("requiere_seguro")),
        "nivel_riesgo": recomendacion_ia.get("nivel_riesgo", ""),
        "puntaje_riesgo": recomendacion_ia.get("puntaje_riesgo"),
        "codigo_seguro_recomendado": recomendacion_ia.get("codigo_seguro_recomendado"),
        "tipo_seguro_recomendado": recomendacion_ia.get("tipo_seguro_recomendado", ""),
        "coberturas_adicionales": recomendacion_ia.get("coberturas_adicionales", []),
        "catalogo_seguros_version": "icc-referencial-v1",
        "resumen_ia": recomendacion_ia.get("resumen_ia", ""),
        "motivos_ia": recomendacion_ia.get("motivos_ia", []),
        "acciones_recomendadas": recomendacion_ia.get("acciones_recomendadas", []),
        "confianza": recomendacion_ia.get("confianza", "media"),
        "motivos": metricas_usadas,
        "fuente_recomendacion": "gemini",
        "modelo_ia": recomendacion_ia.get("modelo_ia", GEMINI_MODEL),
        "configuracion_generacion": obtener_configuracion_generacion(),
        "error_ia": None,
    }

    return jsonify(respuesta)


if __name__ == "__main__":
    app.run(port=5000, debug=True)
