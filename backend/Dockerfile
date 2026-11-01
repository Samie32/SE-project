FROM maven:3.9.11-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src src
RUN mvn -B -q -DskipTests package
FROM eclipse-temurin:21-jre
WORKDIR /app
RUN groupadd --system clinic && useradd --system --gid clinic clinic
COPY --from=build /workspace/target/clinic-backend-0.1.0.jar app.jar
USER clinic
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]
