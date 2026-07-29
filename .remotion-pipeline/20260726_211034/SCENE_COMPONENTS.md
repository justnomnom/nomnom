# SCENE_COMPONENTS — RestaurantReviewsReel

**Skill:** remotion-component-gen  
**Implementation:** All scenes live in `remotion/src/RestaurantReviewsReel.jsx` (single composition — intentional).

| Scene | Component / region | Props used |
|-------|-------------------|------------|
| Hook | Hook scene block | `hookOverline`, `hookLines` |
| Intro | Intro / brand card | `restaurant`, `chips` |
| Consensus | Aggregate block | `consensus`, `restaurant.rating` |
| Review | Review scene ×N | `reviews[i]`, `badgeText` |
| Map | Map + pin | `restaurant.address`, `mapImage`, `circleLabel` |
| CTA | Closing card | `cta` |

No new `.tsx` scene files generated — regenerating would diverge from the design-source port. Extend in-place if a second template is needed.
