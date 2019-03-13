.PHONY: push all deploy

all: push

push:
	clasp push


DEPLOYMENT_COUNT = $(shell clasp deployments | awk '$$0 ~ /^-/ && $$0 !~ /@HEAD/ {print $$2}' | wc -l)
DEPLOYMENT_ID = $(shell clasp deployments | awk '$$0 ~ /^-/ && $$0 !~ /@HEAD/ {print $$2}')

deploy:
	@if [ 1 -ne ${DEPLOYMENT_COUNT} ]; then \
		echo "Need exactly one non-HEAD deployment"; \
		exit 1; \
	fi 
	clasp deploy -i "${DEPLOYMENT_ID}"
