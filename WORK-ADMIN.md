# Cross-Repository Administration

Global repository registry, cross-domain status, and the master calendar are maintained in `krahd/tom-work-admin`.

This repository remains canonical for **Computational Cadavre Exquis** project source, implementation, experiments, and project-specific artistic/technical state.

Any manuscript or publication artefact belongs canonically in `krahd/academic-writing`; submission-specific packages belong in `krahd/professional-opportunities`; grant/funding packages belong in `krahd/grant-applications`.

## Mandatory synchronisation rule

`krahd/tom-work-admin` **must be kept current** whenever work here materially changes the project's administratively meaningful state. Updating the administration repository is part of completing the change, not optional later cleanup.

Update this repository first for substantive project changes, then update `krahd/tom-work-admin` in the same work session when any of the following changes:

- project lifecycle state, scope, conceptual/artistic direction, or major implementation goal;
- deployment, source-chaining behaviour, corpus/source policy, test/validation state, or major implementation milestone;
- relationship to a manuscript, submission, grant, collaborator, repository, dataset/source corpus, or other cross-domain dependency;
- deadline, exhibition, presentation, submission/publication outcome, or other material cross-domain date;
- current next action or major artistic/research/technical gate.

## Ownership boundary

Keep source, implementation, experiments, source/corpus rules, and project-specific artistic/technical evidence here. `tom-work-admin` stores only the concise cross-repository view and must point back to canonical project sources rather than duplicate them.

## Completion check

Before considering a material project-state change complete, verify that:

1. this repository reflects the substantive change;
2. `krahd/tom-work-admin` reflects any resulting global status, relationship, date, or next-action change;
3. related domain repositories are updated when the change affects manuscripts, submissions, or grants;
4. no stale cross-domain status remains in `tom-work-admin`.
