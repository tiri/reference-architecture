#!/bin/sh
# Maven Wrapper script
set -e

# Find JAVA_HOME or use java on PATH
if [ -n "$JAVA_HOME" ]; then
  JAVA_EXEC="$JAVA_HOME/bin/java"
else
  JAVA_EXEC="java"
fi

# Locate the script directory
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
MAVEN_WRAPPER_JAR="$SCRIPT_DIR/.mvn/wrapper/maven-wrapper.jar"
MAVEN_WRAPPER_PROPERTIES="$SCRIPT_DIR/.mvn/wrapper/maven-wrapper.properties"

# Read distribution URL from properties
DISTRIBUTION_URL=$(grep "^distributionUrl" "$MAVEN_WRAPPER_PROPERTIES" | cut -d'=' -f2)

# Download wrapper JAR if missing
if [ ! -f "$MAVEN_WRAPPER_JAR" ]; then
  WRAPPER_URL=$(grep "^wrapperUrl" "$MAVEN_WRAPPER_PROPERTIES" | cut -d'=' -f2)
  echo "Downloading Maven Wrapper JAR from $WRAPPER_URL"
  curl -fsSL -o "$MAVEN_WRAPPER_JAR" "$WRAPPER_URL" || {
    echo "Failed to download Maven Wrapper JAR. Ensure curl is available and the URL is accessible."
    exit 1
  }
fi

exec "$JAVA_EXEC" \
  -classpath "$MAVEN_WRAPPER_JAR" \
  org.apache.maven.wrapper.MavenWrapperMain \
  -Dmaven.multiModuleProjectDirectory="$SCRIPT_DIR" \
  "$@"
