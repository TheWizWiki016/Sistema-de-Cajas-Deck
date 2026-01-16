import os
import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

BASE_URL = "https://vinaterialosnogales.com"
HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "text/html",
}

UPCS = [
    "75026967","7501064191886","7501064120268","75030575","7501064115400",
    "7501064101205","7501064113024","75027278","7501064103328","7501064194139",
    "7501064193859","7501064194146","7501064196935","7501064195013",
    "7501064195310","7501064194214","7501064191909","7501064101465",
    "7501064101410","75027285","7501064197482","7501064199110",
    "7501064199769","7501064199271","7501064199387","7501064199615",
    "7503024460018","7503024460179","7503024460452","7503024460155",
    "7503024460698","7503024460070","7503034941163","7503024460889",
    "7503034941767","7503034941361","7503044233623","7503044233852",
    "7503044233791","7503044233760","7503044233753","7503052713285",
    "7503052713650","7501064103100","7501064194504","7501064198168",
    "7501064198519","7501064199141","7503024460896","7503044233210",
    "7501064112546","7501064194962","7501064107153"
]

def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()

def get_image_url_by_upc(upc: str) -> str | None:
    url = f"{BASE_URL}/index.php?buscar={upc}"
    r = requests.get(url, headers=HEADERS, timeout=20)
    r.raise_for_status()

    soup = BeautifulSoup(r.text, "html.parser")

    for card in soup.select(".contproducto"):
        clave = card.select_one("label.clave")
        if not clave:
            continue

        if upc in normalize(clave.get_text()):
            img = card.find("img")
            if img and img.get("src"):
                return urljoin(BASE_URL + "/", img["src"])

    return None

def download_image(image_url: str, filepath: str):
    r = requests.get(image_url, headers=HEADERS, timeout=30)
    r.raise_for_status()
    with open(filepath, "wb") as f:
        f.write(r.content)

def main():
    os.makedirs("images", exist_ok=True)

    encontrados = []
    no_encontrados = []

    for upc in UPCS:
        print(f"🔎 Buscando UPC {upc}...")
        try:
            img_url = get_image_url_by_upc(upc)
            if not img_url:
                print(f"❌ NO encontrado: {upc}")
                no_encontrados.append(upc)
                continue

            file_path = f"images/{upc}.jpg"
            download_image(img_url, file_path)
            print(f"✅ Descargado: {file_path}")
            encontrados.append(upc)

        except Exception as e:
            print(f"⚠️ Error con {upc}: {e}")
            no_encontrados.append(upc)

    # Reporte
    with open("reporte_no_encontrados.txt", "w", encoding="utf-8") as f:
        for upc in no_encontrados:
            f.write(upc + "\n")

    print("\n📊 RESUMEN FINAL")
    print(f"✔️ Imágenes descargadas: {len(encontrados)}")
    print(f"❌ UPC no encontrados: {len(no_encontrados)}")
    print("📄 Archivo generado: reporte_no_encontrados.txt")

if __name__ == "__main__":
    main()
