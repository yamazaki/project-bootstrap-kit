# Development Project Model

- Status: stable
- Model version: 1.0.0

## 用途

product、service、tool、libraryなど、実装とreleaseを主成果とするproject向け。

## 主な構成

- `AGENTS.md`
- `docs/WORK/0.1/`: idea、product definition、interaction design、phase definition、readiness
- `docs/ROADMAP.md`と`docs/PLAN_PHASE_CURRENT.md`
- `docs/SPEC/`、`docs/ADR/`、`docs/REF/`
- `docs/TECHNOLOGY/`
- `CHANGELOG.md`とversioning規則
- maintenance / operations / advisory作業線
- bootstrap stateとbaseline

## Lifecycle

discoveryから計画、実装、受入、release readiness、production運用へ進む。production後はすべてを新しい開発Phaseへ入れず、機能追加、保守、障害対応、調査を適切な作業線へ分ける。

## Naming

- Project Name: 人向けproject名称
- Project Slug: lowercase kebab-caseの機械識別子
- Product Name: 人向け製品・service名称。省略時はProject Name

## Technology Profile

任意で複数選択できる。採用技術が未確定ならprofileなしで開始し、判断後に追加できる。
