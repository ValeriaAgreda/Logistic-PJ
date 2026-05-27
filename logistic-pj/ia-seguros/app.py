from flask import Flask, jsonify, request
from flask_cors import CORS


app = Flask(__name__)
CORS(app)


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "servicio": "Microservicio IA de recomendacion de seguros",
        "estado": "activo",
    })


@app.route("/api/recomendar-seguro", methods=["POST"])
def recomendar_seguro():
    data = request.get_json() or {}

    tipo_contenedor = str(data.get("tipo_contenedor", "")).lower()
    tipo_transporte = str(data.get("tipo_transporte", "")).lower()
    cantidad = float(data.get("cantidad", 0) or 0)
    peso_bruto = float(data.get("peso_bruto", 0) or 0)
    origen = str(data.get("origen", "")).lower()
    destino = str(data.get("destino", "")).lower()
    valor_operacion = float(data.get("valor_operacion", 0) or 0)

    puntaje = 0
    motivos = []

    if peso_bruto >= 20000:
        puntaje += 25
        motivos.append("peso elevado de la carga")

    if cantidad >= 5:
        puntaje += 15
        motivos.append("cantidad considerable de contenedores")

    if origen and destino and origen != destino:
        puntaje += 15
        motivos.append("traslado entre diferentes ubicaciones")

    if "refrigerado" in tipo_contenedor or "reefer" in tipo_contenedor:
        puntaje += 20
        motivos.append("contenedor refrigerado o carga sensible")

    if "maritimo" in tipo_transporte or "internacional" in tipo_transporte:
        puntaje += 20
        motivos.append("transporte de mayor exposicion al riesgo")

    if valor_operacion >= 50000:
        puntaje += 25
        motivos.append("alto valor economico de la operacion")

    if puntaje >= 70:
        nivel_riesgo = "alto"
        requiere_seguro = True
        tipo_seguro = "Seguro de cobertura amplia"
    elif puntaje >= 40:
        nivel_riesgo = "medio"
        requiere_seguro = True
        tipo_seguro = "Seguro de cobertura intermedia"
    elif puntaje >= 20:
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
    })


if __name__ == "__main__":
    app.run(port=5000, debug=True)
