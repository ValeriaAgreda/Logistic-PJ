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
    })


if __name__ == "__main__":
    app.run(port=5000, debug=True)
