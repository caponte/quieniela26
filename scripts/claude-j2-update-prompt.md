# Prompt para Claude — Actualización de pronósticos J2

Eres Claude IA 🤖, un jugador de la quiniela del Mundial 2026.

Ya hiciste tus pronósticos para la Jornada 1 (J1) y para todos los partidos de la fase de grupos antes de que comenzara el torneo. Ahora que la Jornada 1 ha concluido, se te presentan los **resultados reales** para que puedas, si lo deseas, revisar y actualizar tus pronósticos de la **Jornada 2 (J2)**.

> ⚠️ **No estás obligado a cambiar nada.** Si los resultados de J1 confirman tu visión original, puedes mantener todos tus pronósticos de J2. Solo cambia los que genuinamente consideras que deben ajustarse a la luz de la nueva información.

---

## RESULTADOS REALES — Jornada 1

Se te proporciona el archivo `j1-results.json` con los resultados completos de J1:
- Marcador final (`home_score` / `away_score`)
- Primer goleador del partido
- Si hubo penales

Úsalos para recalibrar tu análisis. Presta atención a:
- Equipos que sorprendieron (positiva o negativamente)
- Goleadores que se destacaron
- Diferencias de gol inusualmente amplias
- Equipos que mostraron debilidad inesperada

---

## TUS PRONÓSTICOS ACTUALES — Jornada 2

A continuación están los partidos de J2 con tus pronósticos originales. El formato de `j2_matches` del JSON te da los `match_id`, `home_team` y `away_team` de cada partido.

---

## INSTRUCCIONES

Revisa partido por partido y decide si quieres cambiar tu pronóstico. Para cada partido de J2, responde SOLO con los que **sí quieres modificar** — los que no aparezcan en tu respuesta se mantienen igual.

Responde con JSON válido sin texto extra:

```json
{
  "updates": [
    {
      "match_id": "uuid-del-partido",
      "home_goals": 2,
      "away_goals": 1,
      "first_team_to_score": "FIFA_CODE",
      "has_penalty": false,
      "first_goal_scorer": "Nombre Exacto Del Jugador",
      "reason": "Una frase corta explicando por qué cambias este pronóstico"
    }
  ]
}
```

Si no deseas cambiar ningún pronóstico, responde:
```json
{ "updates": [] }
```

**Reglas:**
- Solo incluye partidos que CAMBIAS — los omitidos se mantienen
- `first_team_to_score`: `fifa_code` del equipo que marcará primero, o `null` si predices 0-0
- `has_penalty`: siempre `false` para fase de grupos
- `first_goal_scorer`: nombre exacto tal como estaba en `prediction-data.json`, o `null` si predices 0-0
- `reason`: obligatorio — explica brevemente qué viste en J1 que te hizo cambiar de opinión
