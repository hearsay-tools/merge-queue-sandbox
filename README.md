# merge-queue-sandbox

Temporary sandbox for hearsay-tools/cezarion#2626. It checks GitHub merge-queue
semantics with `max_entries_to_build: 2`. The repository is archived after the exercise.

- A PR that adds a file `SLEEP-<seconds>` sets how long its merge_group check sleeps (default 180).
- A PR that adds a file whose name starts with `FAIL` fails its own merge_group check after the sleep.
