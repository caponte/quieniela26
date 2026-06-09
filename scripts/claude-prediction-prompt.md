# Prompt para Claude — Predicciones Mundial 2026

Eres un experto en fútbol internacional participando en una quiniela del Mundial 2026.
Se te proporciona el archivo `prediction-data.json` con todos los grupos, equipos, partidos y jugadores del torneo.

Tu tarea es generar dos bloques de predicciones:

---

## BLOQUE 1 — Bracket completo

Predice quién avanza en cada fase del torneo. Usa siempre el `fifa_code` del equipo.

Para la fase de grupos: elige el 1° y 2° clasificado de cada grupo (A–L).
También elige los 8 mejores terceros que clasifican al R32 (hay 12 grupos, solo pasan 8 terceros).

Para las rondas eliminatorias: usa el `bracket_structure` del JSON para saber quién se enfrenta a quién en cada slot. Los slots del R32 que dicen `3rd(X/Y/Z)` se llenan con el tercer clasificado que elegiste de ese pool de grupos.

Responde SOLO con JSON válido, sin texto extra:

```json
{
  "bracket": {
    "groups": {
      "A": { "first": "FIFA_CODE", "second": "FIFA_CODE", "third": "FIFA_CODE" },
      "B": { "first": "FIFA_CODE", "second": "FIFA_CODE", "third": "FIFA_CODE" },
      "C": { "first": "FIFA_CODE", "second": "FIFA_CODE", "third": "FIFA_CODE" },
      "D": { "first": "FIFA_CODE", "second": "FIFA_CODE", "third": "FIFA_CODE" },
      "E": { "first": "FIFA_CODE", "second": "FIFA_CODE", "third": "FIFA_CODE" },
      "F": { "first": "FIFA_CODE", "second": "FIFA_CODE", "third": "FIFA_CODE" },
      "G": { "first": "FIFA_CODE", "second": "FIFA_CODE", "third": "FIFA_CODE" },
      "H": { "first": "FIFA_CODE", "second": "FIFA_CODE", "third": "FIFA_CODE" },
      "I": { "first": "FIFA_CODE", "second": "FIFA_CODE", "third": "FIFA_CODE" },
      "J": { "first": "FIFA_CODE", "second": "FIFA_CODE", "third": "FIFA_CODE" },
      "K": { "first": "FIFA_CODE", "second": "FIFA_CODE", "third": "FIFA_CODE" },
      "L": { "first": "FIFA_CODE", "second": "FIFA_CODE", "third": "FIFA_CODE" }
    },
    "third_qualifiers": ["FIFA_CODE", "FIFA_CODE", "FIFA_CODE", "FIFA_CODE", "FIFA_CODE", "FIFA_CODE", "FIFA_CODE", "FIFA_CODE"],
    "r32":  ["FIFA_CODE", "FIFA_CODE", "FIFA_CODE", "FIFA_CODE", "FIFA_CODE", "FIFA_CODE", "FIFA_CODE", "FIFA_CODE", "FIFA_CODE", "FIFA_CODE", "FIFA_CODE", "FIFA_CODE", "FIFA_CODE", "FIFA_CODE", "FIFA_CODE", "FIFA_CODE"],
    "r16":  ["FIFA_CODE", "FIFA_CODE", "FIFA_CODE", "FIFA_CODE", "FIFA_CODE", "FIFA_CODE", "FIFA_CODE", "FIFA_CODE"],
    "qf":   ["FIFA_CODE", "FIFA_CODE", "FIFA_CODE", "FIFA_CODE"],
    "sf":   ["FIFA_CODE", "FIFA_CODE"],
    "third": "FIFA_CODE",
    "champion": "FIFA_CODE"
  }
}
```

**Reglas de los arrays:**
- `r32[i]` = ganador del slot i (en el orden exacto del `bracket_structure.r32` del JSON)
- `r16[i]` = ganador del slot i (orden de `bracket_structure.r16`)
- `qf[i]`, `sf[i]` = igual
- `third_qualifiers` = los 8 terceros clasificados que pasan al R32 (en cualquier orden)

---

## BLOQUE 2 — Partidos de fase de grupos

Para cada partido en `group_matches` del JSON, predice el resultado.
Usa los jugadores de `players_by_team` para elegir el primer goleador.

Responde con un array JSON en el mismo orden que `group_matches`:

```json
{
  "matches": [
    {
      "match_id": "uuid-del-partido",
      "home_goals": 2,
      "away_goals": 1,
      "first_team_to_score": "FIFA_CODE",
      "has_penalty": false,
      "first_goal_scorer": "Nombre Exacto Del Jugador"
    }
  ]
}
```

**Reglas:**
- `first_team_to_score`: `fifa_code` del equipo que marcará primero, o `null` si predices 0-0
- `has_penalty`: `true` solo si predices que habrá tanda de penales (eliminatorias)
- `first_goal_scorer`: nombre exacto tal como aparece en `players_by_team`, o `null` si predices 0-0
- Para partidos de fase de grupos `has_penalty` siempre es `false`

---

Basa tus predicciones en rendimiento histórico reciente, calidad de plantilla, forma actual y ventaja de sede (USA, Canadá, México). Sé audaz — no elijas siempre a los favoritos obvios.
