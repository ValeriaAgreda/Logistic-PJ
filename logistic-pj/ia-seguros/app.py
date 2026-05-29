import json
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from flask import Flask, jsonify, request
from flask_cors import CORS


app = Flask(__name__)
CORS(app)


PUNTAJE_TIPO_SERVICIO = {
    "aereo": {
        "puntaje": 25,
        "motivo": "servicio aereo con mayor exigencia de tiempos y manipulacion",
    },
    "bimodal": {
        "puntaje": 20,
        "motivo": "servicio bimodal con transferencia entre medios de transporte",
    },
    "maritimo": {
        "puntaje": 20,
        "motivo": "servicio maritimo con mayor exposicion durante el traslado",
    },
    "terrestre": {
        "puntaje": 10,
        "motivo": "servicio terrestre con exposicion operativa en ruta",
    },
}

PUNTAJE_TIPO_NACIONALIZACION = {
    "abreviado": {
        "puntaje": 10,
        "motivo": "nacionalizacion abreviada con menor complejidad documental",
    },
    "anticipado": {
        "puntaje": 15,
        "motivo": "nacionalizacion anticipada con coordinacion previa de documentos",
    },
    "normal con descarga": {
        "puntaje": 20,
        "motivo": "nacionalizacion normal con descarga y mayor manipulacion de carga",
    },
    "sobre carro": {
        "puntaje": 15,
        "motivo": "nacionalizacion sobre carro con dependencia del tiempo de traslado",
    },
}

HTTP_TIMEOUT = 6
USER_AGENT = "logistic-pj-insurance-ai/1.0"


def obtener_json(url):
    req = Request(url, headers={"User-Agent": USER_AGENT})

    with urlopen(req, timeout=HTTP_TIMEOUT) as response:
        return json.loads(response.read().decode("utf-8"))


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
    puntaje = 0
    motivos = []

    print(f"[IA externa] Consultando APIs para ruta '{origen}' -> '{destino}'", flush=True)

    origen_geo = geocodificar_lugar(origen)
    destino_geo = geocodificar_lugar(destino)
    datos["origen"] = origen_geo
    datos["destino"] = destino_geo

    if not origen_geo or not destino_geo:
        print("[IA externa] No se pudo geocodificar origen o destino.", flush=True)
        return puntaje, motivos, datos

    ruta = obtener_ruta_osrm(origen_geo, destino_geo)
    datos["ruta"] = ruta

    if ruta:
        datos["disponible"] = True
        distancia = ruta["distancia_km"]
        duracion = ruta["duracion_horas"]

        if distancia >= 1000:
            puntaje += 20
            motivos.append("ruta terrestre extensa mayor o igual a 1000 km")
        elif distancia >= 500:
            puntaje += 15
            motivos.append("ruta terrestre de distancia media mayor o igual a 500 km")
        elif distancia >= 200:
            puntaje += 5
            motivos.append("ruta terrestre con distancia moderada")

        if duracion >= 15:
            puntaje += 10
            motivos.append("duracion estimada de ruta elevada")

    clima_origen = obtener_clima_open_meteo(origen_geo)
    clima_destino = obtener_clima_open_meteo(destino_geo)
    datos["clima_origen"] = clima_origen
    datos["clima_destino"] = clima_destino

    for etiqueta, clima in [("origen", clima_origen), ("destino", clima_destino)]:
        if not clima:
            continue

        datos["disponible"] = True
        precipitacion = clima["precipitacion_mm"] + clima["lluvia_mm"]
        viento = clima["viento_kmh"]

        if precipitacion >= 10:
            puntaje += 10
            motivos.append(f"precipitacion elevada en {etiqueta}")
        elif precipitacion >= 2:
            puntaje += 5
            motivos.append(f"precipitacion moderada en {etiqueta}")

        if viento >= 50:
            puntaje += 10
            motivos.append(f"viento fuerte en {etiqueta}")
        elif viento >= 30:
            puntaje += 5
            motivos.append(f"viento moderado en {etiqueta}")

    return puntaje, motivos, datos


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "servicio": "Microservicio IA de recomendacion de seguros",
        "estado": "activo",
    })


@app.route("/api/recomendar-seguro", methods=["POST"])
def recomendar_seguro():
    data = request.get_json() or {}

    tipo_servicio = str(data.get("tipo_servicio", "")).lower()
    tipo_nacionalizacion = str(data.get("tipo_nacionalizacion", "")).lower()
    cantidad = float(data.get("cantidad", 0) or 0)
    origen = str(data.get("origen", "")).lower()
    destino = str(data.get("destino", "")).lower()
    contenedores = data.get("contenedores", [])

    if not isinstance(contenedores, list):
        contenedores = []

    peso_total = 0

    for contenedor in contenedores:
        if not isinstance(contenedor, dict):
            continue

        peso_total += float(contenedor.get("peso_bruto", 0) or 0)

    if not contenedores:
        peso_total = float(data.get("peso_bruto", 0) or 0)

    puntaje = 0
    motivos = []

    if peso_total >= 20000:
        puntaje += 25
        motivos.append("peso total elevado de la carga")

    if cantidad >= 5:
        puntaje += 15
        motivos.append("cantidad considerable de contenedores")

    if origen and destino and origen != destino:
        puntaje += 5
        motivos.append("traslado entre diferentes ubicaciones")

    regla_servicio = PUNTAJE_TIPO_SERVICIO.get(tipo_servicio)
    if regla_servicio:
        puntaje += regla_servicio["puntaje"]
        motivos.append(regla_servicio["motivo"])

    regla_nacionalizacion = PUNTAJE_TIPO_NACIONALIZACION.get(tipo_nacionalizacion)
    if regla_nacionalizacion:
        puntaje += regla_nacionalizacion["puntaje"]
        motivos.append(regla_nacionalizacion["motivo"])

    puntaje_externo, motivos_externos, datos_externos = evaluar_datos_externos(origen, destino)
    puntaje += puntaje_externo
    motivos.extend(motivos_externos)

    if puntaje >= 70:
        nivel_riesgo = "alto"
        requiere_seguro = True
        tipo_seguro = "Seguro de cobertura amplia"
    elif puntaje >= 45:
        nivel_riesgo = "medio"
        requiere_seguro = True
        tipo_seguro = "Seguro de cobertura intermedia"
    elif puntaje >= 30:
        nivel_riesgo = "bajo"
        requiere_seguro = True
        tipo_seguro = "Seguro basico"
    else:
        nivel_riesgo = "muy bajo"
        requiere_seguro = False
        tipo_seguro = "Seguro opcional"

    return jsonify({
        "requiere_seguro": requiere_seguro,
        "nivel_riesgo": nivel_riesgo,
        "puntaje_riesgo": puntaje,
        "tipo_seguro_recomendado": tipo_seguro,
        "motivos": motivos,
        "peso_total": peso_total,
        "cantidad_contenedores": len(contenedores),
        "datos_externos": datos_externos,
    })


if __name__ == "__main__":
    app.run(port=5000, debug=True)
