FROM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /workspace

COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle ./gradle
RUN chmod +x gradlew && ./gradlew --no-daemon dependencies

COPY src ./src
RUN ./gradlew --no-daemon clean test bootJar

FROM eclipse-temurin:21-jre-alpine

RUN addgroup -S memoa && adduser -S memoa -G memoa

WORKDIR /app
COPY --from=builder /workspace/build/libs/memoa.jar /app/memoa.jar

RUN mkdir -p /data && chown -R memoa:memoa /app /data

USER memoa

ENV PORT=8080 \
    MEMOA_DATA_PATH=/data/memoa \
    JAVA_OPTS="-XX:MaxRAMPercentage=75.0 -Dfile.encoding=UTF-8"

VOLUME ["/data"]
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/api/v1/health" || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/memoa.jar"]
