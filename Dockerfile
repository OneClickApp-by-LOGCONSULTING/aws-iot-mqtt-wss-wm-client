FROM tomcat:10-jdk21-temurin
COPY ./target/*.war /usr/local/tomcat/webapps/
