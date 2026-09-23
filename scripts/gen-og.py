#!/usr/bin/env python3
"""Génère public/og.png — la vignette affichée quand on partage un lien (SCRUM-197).

    python3 scripts/gen-og.py

1200x630 : le format lu par Open Graph (Facebook, LinkedIn, WhatsApp, Slack,
Discord) et par `twitter:card = summary_large_image`. Un ratio différent est
recadré au centre par chaque plateforme selon ses propres règles, donc sans
contrôle possible.

L'habillage est celui de la marque, « Encre & Néon », et non celui de
l'interface, « La Clairière » : une vignette apparaît dans un fil sombre ou
clair qu'on ne maîtrise pas, et l'encre tient dans les deux.

DÉPENDANCES EXTERNES AU DÉPÔT — deux, toutes deux dans ~/memora_tage_mage :

  · assets/brand/logo-cutout.png  — Gaston détouré, fond transparent
  · node_modules/@expo-google-fonts/hanken-grotesk/*.ttf

Les .woff2 de public/fonts/ ne conviennent pas : Pillow ne sait pas les lire, et
ni fontTools ni un moteur de rendu SVG ne sont installés ici. Les .ttf d'Expo
sont exactement la même fonte, dans un format que Pillow ouvre.

Le fichier produit EST versionné : le site doit se construire sur Workers Builds
sans accès au dépôt de l'app. Ce script ne tourne que sur la machine de dev,
quand la marque ou le texte changent.
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

APP = Path.home() / 'memora_tage_mage'
FONTS = APP / 'node_modules/@expo-google-fonts/hanken-grotesk'
SITE = Path(__file__).resolve().parent.parent

W, H = 1200, 630

ENCRE = (2, 17, 13)
NEON = (42, 255, 166)
BLANC = (232, 255, 244)   # --brand-ink
SOURDINE = (138, 176, 158)


def fonte(dossier: str, fichier: str, taille: int) -> ImageFont.FreeTypeFont:
    chemin = FONTS / dossier / fichier
    if not chemin.exists():
        raise SystemExit(f'Fonte introuvable : {chemin}\nLancer `npm install` dans {APP} ?')
    return ImageFont.truetype(str(chemin), taille)


def main() -> None:
    img = Image.new('RGB', (W, H), ENCRE)
    d = ImageDraw.Draw(img)

    # Halo néon derrière Gaston. Un dégradé radial dessiné à la main : une suite
    # d'ellipses de plus en plus claires, du centre vers l'extérieur. Sans lui,
    # le personnage flotte sur un aplat noir.
    halo = Image.new('RGB', (W, H), ENCRE)
    hd = ImageDraw.Draw(halo)
    cx, cy = 880, 330
    for i in range(70, 0, -1):
        r = i * 7
        t = (70 - i) / 70          # 0 au bord, 1 au centre
        f = t ** 3 * 0.20          # l'énergie se concentre au centre
        hd.ellipse(
            [cx - r, cy - r, cx + r, cy + r],
            fill=(
                int(ENCRE[0] + (NEON[0] - ENCRE[0]) * f),
                int(ENCRE[1] + (NEON[1] - ENCRE[1]) * f),
                int(ENCRE[2] + (NEON[2] - ENCRE[2]) * f),
            ),
        )
    img = halo
    d = ImageDraw.Draw(img)

    # Gaston, calé sur le bord bas : il « sort » du cadre plutôt que d'y flotter.
    gaston = Image.open(APP / 'assets/brand/logo-cutout.png').convert('RGBA')
    haut = 470
    large = round(gaston.width * haut / gaston.height)
    gaston = gaston.resize((large, haut), Image.LANCZOS)
    # Marge droite volontairement courte : le bloc de texte occupe la moitié
    # gauche, et le point final de « jour. » venait mordre sur la bûche.
    img.paste(gaston, (W - large - 18, H - haut - 40), gaston)

    x = 76

    # Surtitre — le domaine, en petites capitales espacées. Pillow ne gère pas
    # l'interlettrage : on pose les caractères un par un.
    f_sur = fonte('700Bold', 'HankenGrotesk_700Bold.ttf', 24)
    curseur = x
    for c in 'TAGEPOCKET.FR':
        d.text((curseur, 96), c, font=f_sur, fill=NEON)
        curseur += d.textlength(c, font=f_sur) + 4

    f_titre = fonte('800ExtraBold', 'HankenGrotesk_800ExtraBold.ttf', 64)
    d.multiline_text(
        (x, 162),
        'Le TAGE MAGE,\nun peu chaque jour.',
        font=f_titre,
        fill=BLANC,
        spacing=10,
    )

    f_sous = fonte('400Regular', 'HankenGrotesk_400Regular.ttf', 29)
    d.multiline_text(
        (x, 346),
        'Six sous-épreuves, quinze questions,\nvingt minutes. Dans la poche.',
        font=f_sous,
        fill=SOURDINE,
        spacing=8,
    )

    # Filet néon : la seule ligne de la composition, elle referme le bloc texte.
    d.rectangle([x, 452, x + 96, 458], fill=NEON)

    # 256 couleurs : WhatsApp ignore une vignette de plus de 300 ko, et la
    # composition n'a que quatre aplats plus un dégradé. Le tramage de Floyd et
    # Steinberg évite les marches dans le halo.
    sortie = SITE / 'public/og.png'
    img.quantize(colors=256, method=Image.MEDIANCUT, dither=Image.FLOYDSTEINBERG).save(
        sortie, 'PNG', optimize=True
    )
    print(f'{sortie.relative_to(SITE)} — {img.size[0]}x{img.size[1]}, {sortie.stat().st_size} o')


if __name__ == '__main__':
    main()
