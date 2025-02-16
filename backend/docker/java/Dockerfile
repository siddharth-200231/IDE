FROM openjdk:11-jdk-slim

# Create non-root user
RUN useradd -m -d /app coderunner \
    && mkdir -p /app \
    && chown -R coderunner:coderunner /app \
    && chmod 755 /app

WORKDIR /app
USER coderunner