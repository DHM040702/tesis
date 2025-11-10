CREATE DATABASE  IF NOT EXISTS `sia_unasam` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `sia_unasam`;
-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: sia_unasam
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `alertas`
--

DROP TABLE IF EXISTS `alertas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `alertas` (
  `id_alerta` bigint NOT NULL AUTO_INCREMENT,
  `id_estudiante` bigint NOT NULL,
  `id_periodo` int NOT NULL,
  `id_tipo_alerta` tinyint NOT NULL,
  `id_severidad` tinyint NOT NULL,
  `descripcion` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `observacion` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mensaje` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `leida` tinyint(1) DEFAULT '0',
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_alerta`),
  KEY `id_estudiante` (`id_estudiante`),
  KEY `id_tipo_alerta` (`id_tipo_alerta`),
  KEY `id_severidad` (`id_severidad`),
  KEY `ix_alertas_periodo` (`id_periodo`,`id_tipo_alerta`,`id_severidad`),
  CONSTRAINT `alertas_ibfk_1` FOREIGN KEY (`id_estudiante`) REFERENCES `estudiantes` (`id_estudiante`) ON DELETE RESTRICT,
  CONSTRAINT `alertas_ibfk_2` FOREIGN KEY (`id_periodo`) REFERENCES `periodos_academicos` (`id_periodo`) ON DELETE RESTRICT,
  CONSTRAINT `alertas_ibfk_3` FOREIGN KEY (`id_tipo_alerta`) REFERENCES `tipos_alerta` (`id_tipo_alerta`) ON DELETE RESTRICT,
  CONSTRAINT `alertas_ibfk_4` FOREIGN KEY (`id_severidad`) REFERENCES `severidades` (`id_severidad`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `asignaciones_tutoria`
--

DROP TABLE IF EXISTS `asignaciones_tutoria`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asignaciones_tutoria` (
  `id_asignacion` bigint NOT NULL AUTO_INCREMENT,
  `id_tutor` bigint NOT NULL,
  `id_estudiante` bigint NOT NULL,
  `id_periodo` int NOT NULL,
  PRIMARY KEY (`id_asignacion`),
  UNIQUE KEY `uq_asig` (`id_tutor`,`id_estudiante`,`id_periodo`),
  KEY `fk_asig_est` (`id_estudiante`),
  KEY `fk_asig_per` (`id_periodo`),
  CONSTRAINT `fk_asig_est` FOREIGN KEY (`id_estudiante`) REFERENCES `estudiantes` (`id_estudiante`) ON DELETE RESTRICT,
  CONSTRAINT `fk_asig_per` FOREIGN KEY (`id_periodo`) REFERENCES `periodos_academicos` (`id_periodo`) ON DELETE RESTRICT,
  CONSTRAINT `fk_asig_tutor` FOREIGN KEY (`id_tutor`) REFERENCES `tutores` (`id_tutor`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `asistencias`
--

DROP TABLE IF EXISTS `asistencias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asistencias` (
  `id_asistencia` bigint NOT NULL AUTO_INCREMENT,
  `id_matricula` bigint NOT NULL,
  `fecha` date NOT NULL,
  `presente` tinyint(1) NOT NULL,
  `id_fuente_asistencia` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_asistencia`),
  UNIQUE KEY `uq_asistencia` (`id_matricula`,`fecha`),
  KEY `id_fuente_asistencia` (`id_fuente_asistencia`),
  KEY `ix_asistencias_matricula_fecha` (`id_matricula`,`fecha`),
  CONSTRAINT `asistencias_ibfk_1` FOREIGN KEY (`id_matricula`) REFERENCES `matriculas` (`id_matricula`) ON DELETE CASCADE,
  CONSTRAINT `asistencias_ibfk_2` FOREIGN KEY (`id_fuente_asistencia`) REFERENCES `fuentes_asistencia` (`id_fuente_asistencia`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `autoridades`
--

DROP TABLE IF EXISTS `autoridades`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `autoridades` (
  `id_autoridad` int NOT NULL AUTO_INCREMENT,
  `id_persona` bigint NOT NULL,
  `id_cargo` int NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `fecha_inicio` date DEFAULT NULL,
  `fecha_fin` date DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_autoridad`),
  UNIQUE KEY `uq_autoridad_persona` (`id_persona`),
  KEY `ix_autoridades_cargo` (`id_cargo`),
  CONSTRAINT `fk_autoridades_cargo` FOREIGN KEY (`id_cargo`) REFERENCES `cargos` (`id_cargo`) ON DELETE RESTRICT,
  CONSTRAINT `fk_autoridades_persona` FOREIGN KEY (`id_persona`) REFERENCES `personas` (`id_persona`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bitacora_auditoria`
--

DROP TABLE IF EXISTS `bitacora_auditoria`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bitacora_auditoria` (
  `id_bitacora` bigint NOT NULL AUTO_INCREMENT,
  `id_usuario` bigint DEFAULT NULL,
  `accion` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entidad` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `id_entidad` bigint DEFAULT NULL,
  `metadatos_json` json DEFAULT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_bitacora`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `bitacora_auditoria_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `calificaciones`
--

DROP TABLE IF EXISTS `calificaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `calificaciones` (
  `id_calificacion` bigint NOT NULL AUTO_INCREMENT,
  `id_matricula` bigint NOT NULL,
  `nota_parcial` decimal(5,2) DEFAULT NULL,
  `nota_final` decimal(5,2) DEFAULT NULL,
  `actualizado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_calificacion`),
  UNIQUE KEY `uq_calif_matricula` (`id_matricula`),
  KEY `ix_calificaciones_matricula` (`id_matricula`),
  CONSTRAINT `calificaciones_ibfk_1` FOREIGN KEY (`id_matricula`) REFERENCES `matriculas` (`id_matricula`) ON DELETE CASCADE,
  CONSTRAINT `calificaciones_chk_1` CHECK (((`nota_parcial` is null) or ((`nota_parcial` >= 0) and (`nota_parcial` <= 20)))),
  CONSTRAINT `calificaciones_chk_2` CHECK (((`nota_final` is null) or ((`nota_final` >= 0) and (`nota_final` <= 20))))
) ENGINE=InnoDB AUTO_INCREMENT=46600 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cargos`
--

DROP TABLE IF EXISTS `cargos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cargos` (
  `id_cargo` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  PRIMARY KEY (`id_cargo`),
  UNIQUE KEY `uq_cargo_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ciudades`
--

DROP TABLE IF EXISTS `ciudades`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ciudades` (
  `id_ciudad` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_ciudad`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `clasificaciones_fse`
--

DROP TABLE IF EXISTS `clasificaciones_fse`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clasificaciones_fse` (
  `id_clasificacion` tinyint NOT NULL,
  `nombre` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL,
  `puntos_min` int NOT NULL,
  `puntos_max` int NOT NULL,
  PRIMARY KEY (`id_clasificacion`),
  UNIQUE KEY `nombre` (`nombre`),
  CONSTRAINT `clasificaciones_fse_chk_1` CHECK ((`puntos_min` <= `puntos_max`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cursos`
--

DROP TABLE IF EXISTS `cursos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cursos` (
  `id_curso` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `creditos` tinyint NOT NULL,
  PRIMARY KEY (`id_curso`),
  UNIQUE KEY `codigo` (`codigo`),
  UNIQUE KEY `uq_curso_codigo` (`codigo`),
  CONSTRAINT `cursos_chk_1` CHECK ((`creditos` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=46603 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `docentes`
--

DROP TABLE IF EXISTS `docentes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `docentes` (
  `id_docente` int NOT NULL AUTO_INCREMENT,
  `id_persona` bigint NOT NULL,
  `id_departamento` int DEFAULT NULL,
  `categoria` varchar(50) DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_docente`),
  UNIQUE KEY `uq_docente_persona` (`id_persona`),
  CONSTRAINT `fk_docentes_persona` FOREIGN KEY (`id_persona`) REFERENCES `personas` (`id_persona`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `estados_academicos`
--

DROP TABLE IF EXISTS `estados_academicos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `estados_academicos` (
  `id_estado_academico` tinyint NOT NULL,
  `nombre` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_estado_academico`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `estados_matricula`
--

DROP TABLE IF EXISTS `estados_matricula`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `estados_matricula` (
  `id_estado_matricula` tinyint NOT NULL,
  `nombre` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_estado_matricula`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `estados_trabajo`
--

DROP TABLE IF EXISTS `estados_trabajo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `estados_trabajo` (
  `id_estado_trabajo` tinyint NOT NULL,
  `nombre` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_estado_trabajo`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `estados_usuario`
--

DROP TABLE IF EXISTS `estados_usuario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `estados_usuario` (
  `id_estado_usuario` tinyint NOT NULL,
  `nombre` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_estado_usuario`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `estudiantes`
--

DROP TABLE IF EXISTS `estudiantes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `estudiantes` (
  `id_estudiante` bigint NOT NULL AUTO_INCREMENT,
  `id_persona` bigint NOT NULL,
  `id_programa` int DEFAULT NULL,
  `anio_ingreso` smallint DEFAULT NULL,
  `id_estado_academico` tinyint NOT NULL DEFAULT '1',
  `codigo_alumno` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_estudiante`),
  UNIQUE KEY `uq_estudiante_persona` (`id_persona`),
  UNIQUE KEY `codigo_alumno` (`codigo_alumno`),
  UNIQUE KEY `uq_estudiante_codigo` (`codigo_alumno`),
  KEY `id_programa` (`id_programa`),
  KEY `id_estado_academico` (`id_estado_academico`),
  CONSTRAINT `estudiantes_ibfk_1` FOREIGN KEY (`id_persona`) REFERENCES `personas` (`id_persona`) ON DELETE RESTRICT,
  CONSTRAINT `estudiantes_ibfk_2` FOREIGN KEY (`id_programa`) REFERENCES `programas` (`id_programa`) ON DELETE SET NULL,
  CONSTRAINT `estudiantes_ibfk_3` FOREIGN KEY (`id_estado_academico`) REFERENCES `estados_academicos` (`id_estado_academico`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=3925 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `facultades`
--

DROP TABLE IF EXISTS `facultades`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `facultades` (
  `id_facultad` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nombre` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_facultad`),
  UNIQUE KEY `codigo` (`codigo`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fichas_socioeconomicas`
--

DROP TABLE IF EXISTS `fichas_socioeconomicas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fichas_socioeconomicas` (
  `id_ficha` bigint NOT NULL AUTO_INCREMENT,
  `id_estudiante` bigint NOT NULL,
  `id_periodo` int NOT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `total_puntos` int DEFAULT '0',
  `id_clasificacion` tinyint DEFAULT NULL,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `estado` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'activa',
  PRIMARY KEY (`id_ficha`),
  UNIQUE KEY `uq_ficha` (`id_estudiante`,`id_periodo`),
  KEY `id_periodo` (`id_periodo`),
  CONSTRAINT `fichas_socioeconomicas_ibfk_1` FOREIGN KEY (`id_estudiante`) REFERENCES `estudiantes` (`id_estudiante`) ON DELETE RESTRICT,
  CONSTRAINT `fichas_socioeconomicas_ibfk_2` FOREIGN KEY (`id_periodo`) REFERENCES `periodos_academicos` (`id_periodo`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fuentes_asistencia`
--

DROP TABLE IF EXISTS `fuentes_asistencia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fuentes_asistencia` (
  `id_fuente_asistencia` tinyint NOT NULL,
  `nombre` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_fuente_asistencia`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fuentes_datos`
--

DROP TABLE IF EXISTS `fuentes_datos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fuentes_datos` (
  `id_fuente_datos` tinyint NOT NULL AUTO_INCREMENT,
  `nombre` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_fuente_datos`),
  UNIQUE KEY `uq_fuente_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=113 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `generos`
--

DROP TABLE IF EXISTS `generos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `generos` (
  `id_genero` tinyint NOT NULL,
  `nombre` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_genero`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `items_fse`
--

DROP TABLE IF EXISTS `items_fse`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `items_fse` (
  `id_item` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_tipo_item` tinyint NOT NULL,
  `obligatorio` tinyint(1) DEFAULT '1',
  `peso_puntos` int DEFAULT '0',
  PRIMARY KEY (`id_item`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `id_tipo_item` (`id_tipo_item`),
  CONSTRAINT `items_fse_ibfk_1` FOREIGN KEY (`id_tipo_item`) REFERENCES `tipos_item_fse` (`id_tipo_item`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `labels_periodo`
--

DROP TABLE IF EXISTS `labels_periodo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `labels_periodo` (
  `id_estudiante` bigint NOT NULL,
  `id_periodo` int NOT NULL,
  `y` tinyint(1) NOT NULL,
  `causa` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_corte` date NOT NULL DEFAULT (curdate()),
  PRIMARY KEY (`id_estudiante`,`id_periodo`),
  KEY `fk_labels_per` (`id_periodo`),
  CONSTRAINT `fk_labels_est` FOREIGN KEY (`id_estudiante`) REFERENCES `estudiantes` (`id_estudiante`),
  CONSTRAINT `fk_labels_per` FOREIGN KEY (`id_periodo`) REFERENCES `periodos_academicos` (`id_periodo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `matriculas`
--

DROP TABLE IF EXISTS `matriculas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `matriculas` (
  `id_matricula` bigint NOT NULL AUTO_INCREMENT,
  `id_estudiante` bigint NOT NULL,
  `id_curso` int NOT NULL,
  `id_periodo` int NOT NULL,
  `id_estado_matricula` tinyint NOT NULL,
  `fecha_matricula` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `id_docente` int DEFAULT NULL,
  PRIMARY KEY (`id_matricula`),
  UNIQUE KEY `uq_matricula` (`id_estudiante`,`id_curso`,`id_periodo`),
  KEY `id_curso` (`id_curso`),
  KEY `id_periodo` (`id_periodo`),
  KEY `id_estado_matricula` (`id_estado_matricula`),
  KEY `ix_matriculas_est_per` (`id_estudiante`,`id_periodo`),
  KEY `fk_matriculas_docente` (`id_docente`),
  CONSTRAINT `fk_matriculas_docente` FOREIGN KEY (`id_docente`) REFERENCES `docentes` (`id_docente`) ON DELETE SET NULL,
  CONSTRAINT `matriculas_ibfk_1` FOREIGN KEY (`id_estudiante`) REFERENCES `estudiantes` (`id_estudiante`) ON DELETE RESTRICT,
  CONSTRAINT `matriculas_ibfk_2` FOREIGN KEY (`id_curso`) REFERENCES `cursos` (`id_curso`) ON DELETE RESTRICT,
  CONSTRAINT `matriculas_ibfk_3` FOREIGN KEY (`id_periodo`) REFERENCES `periodos_academicos` (`id_periodo`) ON DELETE RESTRICT,
  CONSTRAINT `matriculas_ibfk_4` FOREIGN KEY (`id_estado_matricula`) REFERENCES `estados_matricula` (`id_estado_matricula`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=46609 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `metodos_riesgo`
--

DROP TABLE IF EXISTS `metodos_riesgo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `metodos_riesgo` (
  `id_metodo_riesgo` tinyint NOT NULL,
  `nombre` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_metodo_riesgo`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `modalidades_tutoria`
--

DROP TABLE IF EXISTS `modalidades_tutoria`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `modalidades_tutoria` (
  `id_modalidad_tutoria` tinyint NOT NULL,
  `nombre` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_modalidad_tutoria`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `niveles_riesgo`
--

DROP TABLE IF EXISTS `niveles_riesgo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `niveles_riesgo` (
  `id_nivel_riesgo` tinyint NOT NULL,
  `nombre` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_nivel_riesgo`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `opciones_item_fse`
--

DROP TABLE IF EXISTS `opciones_item_fse`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `opciones_item_fse` (
  `id_opcion` int NOT NULL AUTO_INCREMENT,
  `id_item` int NOT NULL,
  `etiqueta` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `valor_catalogo` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `puntos` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id_opcion`),
  UNIQUE KEY `uq_opcion` (`id_item`,`valor_catalogo`),
  CONSTRAINT `opciones_item_fse_ibfk_1` FOREIGN KEY (`id_item`) REFERENCES `items_fse` (`id_item`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `periodos_academicos`
--

DROP TABLE IF EXISTS `periodos_academicos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `periodos_academicos` (
  `id_periodo` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_periodo`),
  UNIQUE KEY `nombre` (`nombre`),
  UNIQUE KEY `uq_periodo_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=119 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `permisos`
--

DROP TABLE IF EXISTS `permisos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permisos` (
  `id_permiso` smallint NOT NULL AUTO_INCREMENT,
  `clave` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_permiso`),
  UNIQUE KEY `clave` (`clave`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `personas`
--

DROP TABLE IF EXISTS `personas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `personas` (
  `id_persona` bigint NOT NULL AUTO_INCREMENT,
  `dni` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellido_paterno` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellido_materno` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombres` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_genero` tinyint DEFAULT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_persona`),
  UNIQUE KEY `dni` (`dni`),
  KEY `id_genero` (`id_genero`),
  KEY `ix_personas_apellidos` (`apellido_paterno`,`apellido_materno`,`nombres`),
  CONSTRAINT `personas_ibfk_1` FOREIGN KEY (`id_genero`) REFERENCES `generos` (`id_genero`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=3951 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `programas`
--

DROP TABLE IF EXISTS `programas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `programas` (
  `id_programa` int NOT NULL AUTO_INCREMENT,
  `id_facultad` int NOT NULL,
  `codigo` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nombre` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_programa`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `id_facultad` (`id_facultad`),
  CONSTRAINT `programas_ibfk_1` FOREIGN KEY (`id_facultad`) REFERENCES `facultades` (`id_facultad`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `puntajes_riesgo`
--

DROP TABLE IF EXISTS `puntajes_riesgo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `puntajes_riesgo` (
  `id_puntaje` bigint NOT NULL AUTO_INCREMENT,
  `id_estudiante` bigint NOT NULL,
  `id_periodo` int NOT NULL,
  `puntaje` decimal(6,2) NOT NULL,
  `id_nivel_riesgo` tinyint NOT NULL,
  `id_metodo_riesgo` tinyint NOT NULL DEFAULT '1',
  `factores_json` json DEFAULT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_puntaje`),
  UNIQUE KEY `uq_puntaje` (`id_estudiante`,`id_periodo`),
  KEY `id_nivel_riesgo` (`id_nivel_riesgo`),
  KEY `id_metodo_riesgo` (`id_metodo_riesgo`),
  KEY `ix_puntajes_periodo` (`id_periodo`,`id_nivel_riesgo`),
  CONSTRAINT `puntajes_riesgo_ibfk_1` FOREIGN KEY (`id_estudiante`) REFERENCES `estudiantes` (`id_estudiante`) ON DELETE RESTRICT,
  CONSTRAINT `puntajes_riesgo_ibfk_2` FOREIGN KEY (`id_periodo`) REFERENCES `periodos_academicos` (`id_periodo`) ON DELETE RESTRICT,
  CONSTRAINT `puntajes_riesgo_ibfk_3` FOREIGN KEY (`id_nivel_riesgo`) REFERENCES `niveles_riesgo` (`id_nivel_riesgo`) ON DELETE RESTRICT,
  CONSTRAINT `puntajes_riesgo_ibfk_4` FOREIGN KEY (`id_metodo_riesgo`) REFERENCES `metodos_riesgo` (`id_metodo_riesgo`) ON DELETE RESTRICT,
  CONSTRAINT `puntajes_riesgo_chk_1` CHECK (((`puntaje` >= 0) and (`puntaje` <= 100)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `refresh_tokens`
--

DROP TABLE IF EXISTS `refresh_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `refresh_tokens` (
  `id_refresh` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_usuario` bigint NOT NULL,
  `jti` char(36) NOT NULL,
  `token_hash` char(64) NOT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `ip` varchar(45) DEFAULT NULL,
  `expiracion` datetime NOT NULL,
  `revocado` tinyint(1) NOT NULL DEFAULT '0',
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_refresh`),
  UNIQUE KEY `uq_refresh_jti` (`jti`),
  KEY `ix_refresh_user` (`id_usuario`),
  CONSTRAINT `fk_refresh_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `respuestas_fse`
--

DROP TABLE IF EXISTS `respuestas_fse`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `respuestas_fse` (
  `id_respuesta` bigint NOT NULL AUTO_INCREMENT,
  `id_ficha` bigint NOT NULL,
  `id_item` int NOT NULL,
  `id_opcion` int DEFAULT NULL,
  `valor_numero` decimal(12,2) DEFAULT NULL,
  `valor_texto` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `puntos` int NOT NULL DEFAULT '0',
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_respuesta`),
  UNIQUE KEY `uq_resp` (`id_ficha`,`id_item`),
  UNIQUE KEY `uq_resp_ficha_item` (`id_ficha`,`id_item`),
  KEY `id_item` (`id_item`),
  KEY `id_opcion` (`id_opcion`),
  CONSTRAINT `respuestas_fse_ibfk_1` FOREIGN KEY (`id_ficha`) REFERENCES `fichas_socioeconomicas` (`id_ficha`) ON DELETE CASCADE,
  CONSTRAINT `respuestas_fse_ibfk_2` FOREIGN KEY (`id_item`) REFERENCES `items_fse` (`id_item`) ON DELETE RESTRICT,
  CONSTRAINT `respuestas_fse_ibfk_3` FOREIGN KEY (`id_opcion`) REFERENCES `opciones_item_fse` (`id_opcion`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id_rol` tinyint NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_rol`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `roles_permisos`
--

DROP TABLE IF EXISTS `roles_permisos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles_permisos` (
  `id_rol` tinyint NOT NULL,
  `id_permiso` smallint NOT NULL,
  PRIMARY KEY (`id_rol`,`id_permiso`),
  KEY `id_permiso` (`id_permiso`),
  CONSTRAINT `roles_permisos_ibfk_1` FOREIGN KEY (`id_rol`) REFERENCES `roles` (`id_rol`) ON DELETE RESTRICT,
  CONSTRAINT `roles_permisos_ibfk_2` FOREIGN KEY (`id_permiso`) REFERENCES `permisos` (`id_permiso`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `severidades`
--

DROP TABLE IF EXISTS `severidades`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `severidades` (
  `id_severidad` tinyint NOT NULL,
  `nombre` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_severidad`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `situaciones_orfandad`
--

DROP TABLE IF EXISTS `situaciones_orfandad`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `situaciones_orfandad` (
  `id_situacion_orfandad` tinyint NOT NULL,
  `nombre` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_situacion_orfandad`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `situaciones_vivienda`
--

DROP TABLE IF EXISTS `situaciones_vivienda`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `situaciones_vivienda` (
  `id_situacion_vivienda` tinyint NOT NULL,
  `nombre` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_situacion_vivienda`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tipos_alerta`
--

DROP TABLE IF EXISTS `tipos_alerta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tipos_alerta` (
  `id_tipo_alerta` tinyint NOT NULL,
  `nombre` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_tipo_alerta`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tipos_item_fse`
--

DROP TABLE IF EXISTS `tipos_item_fse`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tipos_item_fse` (
  `id_tipo_item` tinyint NOT NULL,
  `nombre` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_tipo_item`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `trabajos_sincronizacion`
--

DROP TABLE IF EXISTS `trabajos_sincronizacion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trabajos_sincronizacion` (
  `id_trabajo` bigint NOT NULL AUTO_INCREMENT,
  `id_fuente_datos` tinyint NOT NULL,
  `id_estado_trabajo` tinyint NOT NULL DEFAULT '1',
  `inicio` datetime DEFAULT NULL,
  `fin` datetime DEFAULT NULL,
  `detalles` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_trabajo`),
  KEY `id_estado_trabajo` (`id_estado_trabajo`),
  KEY `trabajos_sincronizacion_ibfk_1_idx` (`id_fuente_datos`),
  CONSTRAINT `trabajos_sincronizacion_ibfk_1` FOREIGN KEY (`id_fuente_datos`) REFERENCES `fuentes_asistencia` (`id_fuente_asistencia`),
  CONSTRAINT `trabajos_sincronizacion_ibfk_2` FOREIGN KEY (`id_estado_trabajo`) REFERENCES `estados_trabajo` (`id_estado_trabajo`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=110 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tutores`
--

DROP TABLE IF EXISTS `tutores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tutores` (
  `id_tutor` bigint NOT NULL AUTO_INCREMENT,
  `id_usuario` bigint NOT NULL,
  PRIMARY KEY (`id_tutor`),
  UNIQUE KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `tutores_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tutorias`
--

DROP TABLE IF EXISTS `tutorias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tutorias` (
  `id_tutoria` bigint NOT NULL AUTO_INCREMENT,
  `id_estudiante` bigint NOT NULL,
  `id_periodo` int NOT NULL,
  `id_tutor` bigint NOT NULL,
  `fecha_hora` datetime NOT NULL,
  `id_modalidad_tutoria` tinyint NOT NULL,
  `tema` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `observaciones` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `seguimiento` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notas` text COLLATE utf8mb4_unicode_ci,
  `fecha_seguimiento` date DEFAULT NULL,
  PRIMARY KEY (`id_tutoria`),
  KEY `id_estudiante` (`id_estudiante`),
  KEY `id_tutor` (`id_tutor`),
  KEY `id_modalidad_tutoria` (`id_modalidad_tutoria`),
  KEY `tutorias_ibfk_3_idx` (`id_periodo`),
  CONSTRAINT `ix_tut_per` FOREIGN KEY (`id_periodo`) REFERENCES `periodos_academicos` (`id_periodo`),
  CONSTRAINT `tutorias_ibfk_1` FOREIGN KEY (`id_estudiante`) REFERENCES `estudiantes` (`id_estudiante`) ON DELETE RESTRICT,
  CONSTRAINT `tutorias_ibfk_2` FOREIGN KEY (`id_tutor`) REFERENCES `tutores` (`id_tutor`) ON DELETE RESTRICT,
  CONSTRAINT `tutorias_ibfk_3` FOREIGN KEY (`id_modalidad_tutoria`) REFERENCES `modalidades_tutoria` (`id_modalidad_tutoria`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id_usuario` bigint NOT NULL AUTO_INCREMENT,
  `id_persona` bigint NOT NULL,
  `correo` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contrasenia_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_estado_usuario` tinyint NOT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `correo` (`correo`),
  KEY `id_persona` (`id_persona`),
  KEY `id_estado_usuario` (`id_estado_usuario`),
  CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`id_persona`) REFERENCES `personas` (`id_persona`) ON DELETE RESTRICT,
  CONSTRAINT `usuarios_ibfk_2` FOREIGN KEY (`id_estado_usuario`) REFERENCES `estados_usuario` (`id_estado_usuario`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `usuarios_roles`
--

DROP TABLE IF EXISTS `usuarios_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios_roles` (
  `id_usuario` bigint NOT NULL,
  `id_rol` tinyint NOT NULL,
  PRIMARY KEY (`id_usuario`,`id_rol`),
  KEY `id_rol` (`id_rol`),
  CONSTRAINT `usuarios_roles_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT,
  CONSTRAINT `usuarios_roles_ibfk_2` FOREIGN KEY (`id_rol`) REFERENCES `roles` (`id_rol`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary view structure for view `v_asistencia_periodo`
--

DROP TABLE IF EXISTS `v_asistencia_periodo`;
/*!50001 DROP VIEW IF EXISTS `v_asistencia_periodo`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_asistencia_periodo` AS SELECT 
 1 AS `id_estudiante`,
 1 AS `id_periodo`,
 1 AS `asistencia_pct`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_desaprobados_periodo`
--

DROP TABLE IF EXISTS `v_desaprobados_periodo`;
/*!50001 DROP VIEW IF EXISTS `v_desaprobados_periodo`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_desaprobados_periodo` AS SELECT 
 1 AS `id_estudiante`,
 1 AS `id_periodo`,
 1 AS `cursos_desaprobados`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_desercion_academica`
--

DROP TABLE IF EXISTS `v_desercion_academica`;
/*!50001 DROP VIEW IF EXISTS `v_desercion_academica`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_desercion_academica` AS SELECT 
 1 AS `id_estudiante`,
 1 AS `id_periodo`,
 1 AS `periodo`,
 1 AS `deserta`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_periodo_anterior`
--

DROP TABLE IF EXISTS `v_periodo_anterior`;
/*!50001 DROP VIEW IF EXISTS `v_periodo_anterior`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_periodo_anterior` AS SELECT 
 1 AS `id_actual`,
 1 AS `id_anterior`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_periodo_siguiente`
--

DROP TABLE IF EXISTS `v_periodo_siguiente`;
/*!50001 DROP VIEW IF EXISTS `v_periodo_siguiente`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_periodo_siguiente` AS SELECT 
 1 AS `id_actual`,
 1 AS `id_siguiente`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_promedio_periodo`
--

DROP TABLE IF EXISTS `v_promedio_periodo`;
/*!50001 DROP VIEW IF EXISTS `v_promedio_periodo`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_promedio_periodo` AS SELECT 
 1 AS `id_estudiante`,
 1 AS `id_periodo`,
 1 AS `promedio`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_resumen_ficha`
--

DROP TABLE IF EXISTS `v_resumen_ficha`;
/*!50001 DROP VIEW IF EXISTS `v_resumen_ficha`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_resumen_ficha` AS SELECT 
 1 AS `id_ficha`,
 1 AS `id_estudiante`,
 1 AS `estudiante`,
 1 AS `periodo`,
 1 AS `total_puntos`,
 1 AS `clasificacion`,
 1 AS `proc_puntos`,
 1 AS `proc_texto`,
 1 AS `sife_puntos`,
 1 AS `sife_valor`,
 1 AS `vivi_puntos`,
 1 AS `vivi_texto`,
 1 AS `promedio_ponderado`,
 1 AS `carg_puntos`,
 1 AS `carg_valor`,
 1 AS `depe_puntos`,
 1 AS `depe_valor`,
 1 AS `orfa_puntos`,
 1 AS `orfa_texto`,
 1 AS `pens_puntos`,
 1 AS `pens_valor`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `vw_dataset_modelo`
--

DROP TABLE IF EXISTS `vw_dataset_modelo`;
/*!50001 DROP VIEW IF EXISTS `vw_dataset_modelo`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_dataset_modelo` AS SELECT 
 1 AS `id_estudiante`,
 1 AS `promedio`,
 1 AS `asistencia`,
 1 AS `fse_puntos`,
 1 AS `clasificacion`,
 1 AS `sesiones_tutoria`,
 1 AS `riesgo_prev`,
 1 AS `nivel_prev`,
 1 AS `nivel_actual`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `vw_dataset_modelo_notas`
--

DROP TABLE IF EXISTS `vw_dataset_modelo_notas`;
/*!50001 DROP VIEW IF EXISTS `vw_dataset_modelo_notas`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_dataset_modelo_notas` AS SELECT 
 1 AS `codigo_alumno`,
 1 AS `periodo`,
 1 AS `promedio`,
 1 AS `deserta`*/;
SET character_set_client = @saved_cs_client;

--
-- Dumping events for database 'sia_unasam'
--

--
-- Dumping routines for database 'sia_unasam'
--
/*!50003 DROP PROCEDURE IF EXISTS `sp_generar_alertas_periodo` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_generar_alertas_periodo`(IN p_id_periodo INT)
BEGIN
  DECLARE v_tipo_asistencia TINYINT;
  DECLARE v_tipo_nota TINYINT;
  DECLARE v_tipo_combinado TINYINT;
  DECLARE v_tipo_falta_tutoria TINYINT;
  DECLARE v_sev_baja TINYINT;
  DECLARE v_sev_media TINYINT;
  DECLARE v_sev_alta TINYINT;

  SELECT id_tipo_alerta INTO v_tipo_asistencia FROM tipos_alerta WHERE nombre='asistencia';
  SELECT id_tipo_alerta INTO v_tipo_nota FROM tipos_alerta WHERE nombre='nota';
  SELECT id_tipo_alerta INTO v_tipo_combinado FROM tipos_alerta WHERE nombre='combinado';
  SELECT id_tipo_alerta INTO v_tipo_falta_tutoria FROM tipos_alerta WHERE nombre='falta_tutoria';

  SELECT id_severidad INTO v_sev_baja FROM severidades WHERE nombre='baja';
  SELECT id_severidad INTO v_sev_media FROM severidades WHERE nombre='media';
  SELECT id_severidad INTO v_sev_alta FROM severidades WHERE nombre='alta';

  -- Asistencia < 70%
  INSERT INTO alertas (id_estudiante, id_periodo, id_tipo_alerta, id_severidad, mensaje)
  SELECT
    a.id_estudiante,
    p_id_periodo,
    v_tipo_asistencia,
    CASE
      WHEN a.asistencia_pct < 50 THEN v_sev_alta
      WHEN a.asistencia_pct < 60 THEN v_sev_media
      ELSE v_sev_baja
    END,
    CONCAT('Asistencia baja: ', ROUND(a.asistencia_pct,1), '%')
  FROM v_asistencia_periodo a
  LEFT JOIN alertas al ON al.id_estudiante=a.id_estudiante AND al.id_periodo=p_id_periodo
                        AND al.id_tipo_alerta=v_tipo_asistencia
  WHERE a.id_periodo=p_id_periodo
    AND a.asistencia_pct < 70
    AND al.id_alerta IS NULL;

  -- Promedio < 11
  INSERT INTO alertas (id_estudiante, id_periodo, id_tipo_alerta, id_severidad, mensaje)
  SELECT
    pr.id_estudiante,
    p_id_periodo,
    v_tipo_nota,
    CASE
      WHEN pr.promedio < 8 THEN v_sev_alta
      WHEN pr.promedio < 10 THEN v_sev_media
      ELSE v_sev_baja
    END,
    CONCAT('Promedio bajo: ', ROUND(pr.promedio,2))
  FROM v_promedio_periodo pr
  LEFT JOIN alertas al ON al.id_estudiante=pr.id_estudiante AND al.id_periodo=p_id_periodo
                        AND al.id_tipo_alerta=v_tipo_nota
  WHERE pr.id_periodo=p_id_periodo
    AND pr.promedio < 11
    AND al.id_alerta IS NULL;

  -- Score < 50
  INSERT INTO alertas (id_estudiante, id_periodo, id_tipo_alerta, id_severidad, mensaje)
  SELECT
    r.id_estudiante,
    p_id_periodo,
    v_tipo_combinado,
    v_sev_alta,
    CONCAT('Riesgo alto: score ', r.puntaje)
  FROM puntajes_riesgo r
  LEFT JOIN alertas al ON al.id_estudiante=r.id_estudiante AND al.id_periodo=p_id_periodo
                        AND al.id_tipo_alerta=v_tipo_combinado
  WHERE r.id_periodo=p_id_periodo
    AND r.puntaje < 50
    AND al.id_alerta IS NULL;

  -- Riesgo medio/alto sin tutoría 14 días
  INSERT INTO alertas (id_estudiante, id_periodo, id_tipo_alerta, id_severidad, mensaje)
  SELECT
    r.id_estudiante,
    p_id_periodo,
    v_tipo_falta_tutoria,
    v_sev_media,
    'Riesgo sin tutoría en 14 días'
  FROM puntajes_riesgo r
  JOIN niveles_riesgo nr ON nr.id_nivel_riesgo=r.id_nivel_riesgo AND nr.nombre IN ('medio','alto')
  LEFT JOIN sesiones_tutoria st
    ON st.id_estudiante=r.id_estudiante
   AND st.fecha_hora >= DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY)
  LEFT JOIN alertas al ON al.id_estudiante=r.id_estudiante AND al.id_periodo=p_id_periodo
                        AND al.id_tipo_alerta=v_tipo_falta_tutoria
  WHERE r.id_periodo=p_id_periodo
    AND st.id_sesion IS NULL
    AND al.id_alerta IS NULL;

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_recalcular_ficha_fse` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_recalcular_ficha_fse`(IN p_id_ficha BIGINT)
BEGIN
  DECLARE v_total INT DEFAULT 0;
  DECLARE v_id_clasificacion TINYINT DEFAULT NULL;

  UPDATE respuestas_fse r
  JOIN fichas_socioeconomicas f ON f.id_ficha = r.id_ficha
  JOIN items_fse i ON i.id_item = r.id_item
  LEFT JOIN opciones_item_fse o ON o.id_opcion = r.id_opcion
  SET r.puntos =
    CASE
      WHEN i.id_tipo_item = 1 THEN IFNULL(o.puntos,0)
      WHEN i.codigo = 'PROM' THEN IFNULL(ROUND(LEAST(GREATEST(r.valor_numero,0),20) * 1),0)
      WHEN i.codigo = 'CARG' THEN
        CASE
          WHEN r.valor_numero IS NULL OR r.valor_numero <= 0 THEN 0
          WHEN r.valor_numero BETWEEN 1 AND 2 THEN 16
          ELSE 20
        END
      WHEN i.codigo = 'DEPE' THEN
        CASE
          WHEN r.valor_numero IS NULL THEN 0
          WHEN r.valor_numero = 1 THEN 10
          WHEN r.valor_numero = 2 THEN 14
          ELSE 18
        END
      WHEN i.codigo = 'CRMI' THEN
        CASE
          WHEN r.valor_numero IS NULL THEN 0
          WHEN r.valor_numero = 0 THEN 16
          WHEN r.valor_numero BETWEEN 1 AND 15 THEN 10
          ELSE 5
        END
      WHEN i.codigo = 'CRAP' THEN
        CASE
          WHEN r.valor_numero IS NULL THEN 0
          WHEN r.valor_numero >= 22 THEN 20
          WHEN r.valor_numero BETWEEN 10 AND 21 THEN 12
          ELSE 6
        END
      WHEN i.codigo = 'SIFE' THEN
        CASE
          WHEN r.valor_numero IS NULL THEN 0
          WHEN r.valor_numero <= 1000 THEN 14
          WHEN r.valor_numero BETWEEN 1001 AND 2000 THEN 10
          ELSE 6
        END
      WHEN i.codigo = 'PENS' THEN
        CASE
          WHEN r.valor_numero IS NULL THEN 0
          WHEN r.valor_numero = 0 THEN 20
          WHEN r.valor_numero BETWEEN 1 AND 300 THEN 12
          ELSE 6
        END
      ELSE 0
    END
  WHERE r.id_ficha = p_id_ficha;

  SELECT IFNULL(SUM(puntos),0) INTO v_total
  FROM respuestas_fse WHERE id_ficha = p_id_ficha;

  SELECT c.id_clasificacion INTO v_id_clasificacion
  FROM clasificaciones_fse c
  WHERE v_total BETWEEN c.puntos_min AND c.puntos_max
  LIMIT 1;

  UPDATE fichas_socioeconomicas
  SET total_puntos = v_total,
      id_clasificacion = v_id_clasificacion
  WHERE id_ficha = p_id_ficha;

  UPDATE respuestas_fse r
  JOIN items_fse i ON i.id_item = r.id_item AND i.codigo='CLAS'
  JOIN clasificaciones_fse c ON c.id_clasificacion = v_id_clasificacion
  SET r.valor_texto = c.nombre, r.puntos = 0
  WHERE r.id_ficha = p_id_ficha;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_recalcular_riesgo_periodo` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_recalcular_riesgo_periodo`(IN p_id_periodo INT)
BEGIN
  /* 1) Base: alumnos con matrícula en el periodo */
  DROP TEMPORARY TABLE IF EXISTS tmp_base;
  CREATE TEMPORARY TABLE tmp_base
  ENGINE=Memory
  AS
  SELECT DISTINCT m.id_estudiante
  FROM matriculas m
  WHERE m.id_periodo = p_id_periodo;

  /* 2) Features 1-a-1 por (alumno, periodo) */
  DROP TEMPORARY TABLE IF EXISTS tmp_feats;
  CREATE TEMPORARY TABLE tmp_feats
  ENGINE=Memory
  AS
  SELECT
    b.id_estudiante,
    p_id_periodo AS id_periodo,
    COALESCE(vp.promedio, 0)             AS promedio,
    COALESCE(va.asistencia_pct, 100.0)   AS asistencia_pct,
    COALESCE(f.total_puntos, 0)          AS fse_puntos
  FROM tmp_base b
  LEFT JOIN v_promedio_periodo   vp ON vp.id_estudiante = b.id_estudiante AND vp.id_periodo = p_id_periodo
  LEFT JOIN v_asistencia_periodo va ON va.id_estudiante = b.id_estudiante AND va.id_periodo = p_id_periodo
  LEFT JOIN fichas_socioeconomicas f ON f.id_estudiante = b.id_estudiante AND f.id_periodo = p_id_periodo;

  /* 3) Upsert a puntajes_riesgo (requiere UNIQUE(id_estudiante,id_periodo)) */
  INSERT INTO puntajes_riesgo
    (id_estudiante, id_periodo, puntaje, id_nivel_riesgo, id_metodo_riesgo, factores_json, creado_en)
  SELECT
    id_estudiante,
    id_periodo,
    ROUND( (promedio*5) + (asistencia_pct*0.3) + (LEAST(fse_puntos, 100)*0.2), 2 ) AS puntaje,
    CASE
      WHEN ( (promedio*5) + (asistencia_pct*0.3) + (LEAST(fse_puntos,100)*0.2) ) >= 70 THEN 1
      WHEN ( (promedio*5) + (asistencia_pct*0.3) + (LEAST(fse_puntos,100)*0.2) ) >= 50 THEN 2
      ELSE 3
    END AS id_nivel_riesgo,
    1 AS id_metodo_riesgo,
    /* Si tu versión no soporta JSON_OBJECT, cambia por CONCAT con texto plano */
    JSON_OBJECT('promedio', promedio, 'asistencia', asistencia_pct, 'fse', fse_puntos) AS factores_json,
    NOW()
  FROM tmp_feats
  ON DUPLICATE KEY UPDATE
    puntaje        = VALUES(puntaje),
    id_nivel_riesgo= VALUES(id_nivel_riesgo),
    id_metodo_riesgo=VALUES(id_metodo_riesgo),
    factores_json  = VALUES(factores_json),
    creado_en      = NOW();

  /* 4) Limpieza */
  DROP TEMPORARY TABLE IF EXISTS tmp_feats;
  DROP TEMPORARY TABLE IF EXISTS tmp_base;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Final view structure for view `v_asistencia_periodo`
--

/*!50001 DROP VIEW IF EXISTS `v_asistencia_periodo`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_asistencia_periodo` AS select `m`.`id_estudiante` AS `id_estudiante`,`m`.`id_periodo` AS `id_periodo`,(case when (count(`a`.`id_asistencia`) = 0) then 100.0 else ((100.0 * sum(`a`.`presente`)) / count(`a`.`id_asistencia`)) end) AS `asistencia_pct` from (`matriculas` `m` left join `asistencias` `a` on((`a`.`id_matricula` = `m`.`id_matricula`))) group by `m`.`id_estudiante`,`m`.`id_periodo` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_desaprobados_periodo`
--

/*!50001 DROP VIEW IF EXISTS `v_desaprobados_periodo`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_desaprobados_periodo` AS select `m`.`id_estudiante` AS `id_estudiante`,`m`.`id_periodo` AS `id_periodo`,sum((case when (`em`.`nombre` = 'desaprobado') then 1 else 0 end)) AS `cursos_desaprobados` from (`matriculas` `m` join `estados_matricula` `em` on((`em`.`id_estado_matricula` = `m`.`id_estado_matricula`))) group by `m`.`id_estudiante`,`m`.`id_periodo` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_desercion_academica`
--

/*!50001 DROP VIEW IF EXISTS `v_desercion_academica`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_desercion_academica` AS select `e`.`id_estudiante` AS `id_estudiante`,`pa`.`id_periodo` AS `id_periodo`,`pa`.`nombre` AS `periodo`,(case when (not exists(select 1 from `matriculas` `m2` where ((`m2`.`id_estudiante` = `e`.`id_estudiante`) and (`m2`.`id_periodo` = (select min(`p2`.`id_periodo`) from `periodos_academicos` `p2` where (`p2`.`id_periodo` > `pa`.`id_periodo`)))))) then 1 else 0 end) AS `deserta` from ((`estudiantes` `e` join `matriculas` `m` on((`m`.`id_estudiante` = `e`.`id_estudiante`))) join `periodos_academicos` `pa` on((`pa`.`id_periodo` = `m`.`id_periodo`))) group by `e`.`id_estudiante`,`pa`.`id_periodo` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_periodo_anterior`
--

/*!50001 DROP VIEW IF EXISTS `v_periodo_anterior`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_periodo_anterior` AS select `p1`.`id_periodo` AS `id_actual`,(select `p2`.`id_periodo` from `periodos_academicos` `p2` where (((case when (substring_index(`p1`.`nombre`,'-',-(1)) = '2') then concat(substring_index(`p1`.`nombre`,'-',1),'-1') else concat(cast((substring_index(`p1`.`nombre`,'-',1) - 1) as char charset utf8mb4),'-2') end) collate utf8mb4_unicode_ci) = (`p2`.`nombre` collate utf8mb4_unicode_ci)) limit 1) AS `id_anterior` from `periodos_academicos` `p1` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_periodo_siguiente`
--

/*!50001 DROP VIEW IF EXISTS `v_periodo_siguiente`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_periodo_siguiente` AS select `p2`.`id_periodo` AS `id_actual`,`p1`.`id_periodo` AS `id_siguiente` from ((`v_periodo_anterior` `v` join `periodos_academicos` `p1` on((`p1`.`id_periodo` = `v`.`id_actual`))) join `periodos_academicos` `p2` on((`p2`.`id_periodo` = `v`.`id_anterior`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_promedio_periodo`
--

/*!50001 DROP VIEW IF EXISTS `v_promedio_periodo`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_promedio_periodo` AS select `m`.`id_estudiante` AS `id_estudiante`,`m`.`id_periodo` AS `id_periodo`,avg(`c`.`nota_final`) AS `promedio` from (`matriculas` `m` join `calificaciones` `c` on((`c`.`id_matricula` = `m`.`id_matricula`))) where (`c`.`nota_final` is not null) group by `m`.`id_estudiante`,`m`.`id_periodo` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_resumen_ficha`
--

/*!50001 DROP VIEW IF EXISTS `v_resumen_ficha`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_resumen_ficha` AS select `f`.`id_ficha` AS `id_ficha`,`f`.`id_estudiante` AS `id_estudiante`,concat_ws(' ',`p`.`apellido_paterno`,`p`.`apellido_materno`,',',`p`.`nombres`) AS `estudiante`,`pa`.`nombre` AS `periodo`,`f`.`total_puntos` AS `total_puntos`,`cf`.`nombre` AS `clasificacion`,(select `ro`.`puntos` from (`respuestas_fse` `ro` join `items_fse` `io` on((`io`.`id_item` = `ro`.`id_item`))) where ((`ro`.`id_ficha` = `f`.`id_ficha`) and (`io`.`codigo` = 'PROC'))) AS `proc_puntos`,(select `oi`.`etiqueta` from ((`respuestas_fse` `ro` join `items_fse` `io` on((`io`.`id_item` = `ro`.`id_item`))) join `opciones_item_fse` `oi` on((`oi`.`id_opcion` = `ro`.`id_opcion`))) where ((`ro`.`id_ficha` = `f`.`id_ficha`) and (`io`.`codigo` = 'PROC'))) AS `proc_texto`,(select `ro`.`puntos` from (`respuestas_fse` `ro` join `items_fse` `io` on((`io`.`id_item` = `ro`.`id_item`))) where ((`ro`.`id_ficha` = `f`.`id_ficha`) and (`io`.`codigo` = 'SIFE'))) AS `sife_puntos`,(select `ro`.`valor_numero` from (`respuestas_fse` `ro` join `items_fse` `io` on((`io`.`id_item` = `ro`.`id_item`))) where ((`ro`.`id_ficha` = `f`.`id_ficha`) and (`io`.`codigo` = 'SIFE'))) AS `sife_valor`,(select `ro`.`puntos` from (`respuestas_fse` `ro` join `items_fse` `io` on((`io`.`id_item` = `ro`.`id_item`))) where ((`ro`.`id_ficha` = `f`.`id_ficha`) and (`io`.`codigo` = 'VIVI'))) AS `vivi_puntos`,(select `oi`.`etiqueta` from ((`respuestas_fse` `ro` join `items_fse` `io` on((`io`.`id_item` = `ro`.`id_item`))) join `opciones_item_fse` `oi` on((`oi`.`id_opcion` = `ro`.`id_opcion`))) where ((`ro`.`id_ficha` = `f`.`id_ficha`) and (`io`.`codigo` = 'VIVI'))) AS `vivi_texto`,(select `ro`.`valor_numero` from (`respuestas_fse` `ro` join `items_fse` `io` on((`io`.`id_item` = `ro`.`id_item`))) where ((`ro`.`id_ficha` = `f`.`id_ficha`) and (`io`.`codigo` = 'PROM'))) AS `promedio_ponderado`,(select `ro`.`puntos` from (`respuestas_fse` `ro` join `items_fse` `io` on((`io`.`id_item` = `ro`.`id_item`))) where ((`ro`.`id_ficha` = `f`.`id_ficha`) and (`io`.`codigo` = 'CARG'))) AS `carg_puntos`,(select `ro`.`valor_numero` from (`respuestas_fse` `ro` join `items_fse` `io` on((`io`.`id_item` = `ro`.`id_item`))) where ((`ro`.`id_ficha` = `f`.`id_ficha`) and (`io`.`codigo` = 'CARG'))) AS `carg_valor`,(select `ro`.`puntos` from (`respuestas_fse` `ro` join `items_fse` `io` on((`io`.`id_item` = `ro`.`id_item`))) where ((`ro`.`id_ficha` = `f`.`id_ficha`) and (`io`.`codigo` = 'DEPE'))) AS `depe_puntos`,(select `ro`.`valor_numero` from (`respuestas_fse` `ro` join `items_fse` `io` on((`io`.`id_item` = `ro`.`id_item`))) where ((`ro`.`id_ficha` = `f`.`id_ficha`) and (`io`.`codigo` = 'DEPE'))) AS `depe_valor`,(select `ro`.`puntos` from (`respuestas_fse` `ro` join `items_fse` `io` on((`io`.`id_item` = `ro`.`id_item`))) where ((`ro`.`id_ficha` = `f`.`id_ficha`) and (`io`.`codigo` = 'ORFA'))) AS `orfa_puntos`,(select `oi`.`etiqueta` from ((`respuestas_fse` `ro` join `items_fse` `io` on((`io`.`id_item` = `ro`.`id_item`))) join `opciones_item_fse` `oi` on((`oi`.`id_opcion` = `ro`.`id_opcion`))) where ((`ro`.`id_ficha` = `f`.`id_ficha`) and (`io`.`codigo` = 'ORFA'))) AS `orfa_texto`,(select `ro`.`puntos` from (`respuestas_fse` `ro` join `items_fse` `io` on((`io`.`id_item` = `ro`.`id_item`))) where ((`ro`.`id_ficha` = `f`.`id_ficha`) and (`io`.`codigo` = 'PENS'))) AS `pens_puntos`,(select `ro`.`valor_numero` from (`respuestas_fse` `ro` join `items_fse` `io` on((`io`.`id_item` = `ro`.`id_item`))) where ((`ro`.`id_ficha` = `f`.`id_ficha`) and (`io`.`codigo` = 'PENS'))) AS `pens_valor` from ((((`fichas_socioeconomicas` `f` join `estudiantes` `e` on((`e`.`id_estudiante` = `f`.`id_estudiante`))) left join `personas` `p` on((`p`.`id_persona` = `e`.`id_persona`))) join `periodos_academicos` `pa` on((`pa`.`id_periodo` = `f`.`id_periodo`))) left join `clasificaciones_fse` `cf` on((`cf`.`id_clasificacion` = `f`.`id_clasificacion`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_dataset_modelo`
--

/*!50001 DROP VIEW IF EXISTS `vw_dataset_modelo`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_dataset_modelo` AS select `e`.`id_estudiante` AS `id_estudiante`,coalesce(`vp`.`promedio`,0) AS `promedio`,coalesce(`va`.`asistencia_pct`,0) AS `asistencia`,coalesce(`fs`.`total_puntos`,0) AS `fse_puntos`,`fs`.`id_clasificacion` AS `clasificacion`,coalesce(`tt`.`sesiones_tutoria`,0) AS `sesiones_tutoria`,`pr_prev`.`puntaje` AS `riesgo_prev`,`pr_prev`.`id_nivel_riesgo` AS `nivel_prev`,`pr_curr`.`id_nivel_riesgo` AS `nivel_actual` from ((((((`estudiantes` `e` left join `v_promedio_periodo` `vp` on(((`vp`.`id_estudiante` = `e`.`id_estudiante`) and (`vp`.`id_periodo` = (select max(`periodos_academicos`.`id_periodo`) from `periodos_academicos`))))) left join `v_asistencia_periodo` `va` on(((`va`.`id_estudiante` = `e`.`id_estudiante`) and (`va`.`id_periodo` = (select max(`periodos_academicos`.`id_periodo`) from `periodos_academicos`))))) left join `fichas_socioeconomicas` `fs` on(((`fs`.`id_estudiante` = `e`.`id_estudiante`) and (`fs`.`id_periodo` = (select max(`periodos_academicos`.`id_periodo`) from `periodos_academicos`))))) left join (select `tutorias`.`id_estudiante` AS `id_estudiante`,count(0) AS `sesiones_tutoria` from `tutorias` where (`tutorias`.`id_periodo` = (select max(`periodos_academicos`.`id_periodo`) from `periodos_academicos`)) group by `tutorias`.`id_estudiante`) `tt` on((`tt`.`id_estudiante` = `e`.`id_estudiante`))) left join `puntajes_riesgo` `pr_prev` on(((`pr_prev`.`id_estudiante` = `e`.`id_estudiante`) and (`pr_prev`.`id_periodo` = (select max(`pa`.`id_periodo`) from `periodos_academicos` `pa` where (`pa`.`id_periodo` < (select max(`periodos_academicos`.`id_periodo`) from `periodos_academicos`))))))) left join `puntajes_riesgo` `pr_curr` on(((`pr_curr`.`id_estudiante` = `e`.`id_estudiante`) and (`pr_curr`.`id_periodo` = (select max(`periodos_academicos`.`id_periodo`) from `periodos_academicos`))))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_dataset_modelo_notas`
--

/*!50001 DROP VIEW IF EXISTS `vw_dataset_modelo_notas`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_dataset_modelo_notas` AS select `e`.`codigo_alumno` AS `codigo_alumno`,`pa`.`nombre` AS `periodo`,`vp`.`promedio` AS `promedio`,`vd`.`deserta` AS `deserta` from ((((`v_promedio_periodo` `vp` join `matriculas` `m` on(((`m`.`id_estudiante` = `vp`.`id_estudiante`) and (`m`.`id_periodo` = `vp`.`id_periodo`)))) join `periodos_academicos` `pa` on((`pa`.`id_periodo` = `vp`.`id_periodo`))) join `estudiantes` `e` on((`e`.`id_estudiante` = `vp`.`id_estudiante`))) join `v_desercion_academica` `vd` on(((`vd`.`id_estudiante` = `vp`.`id_estudiante`) and (`vd`.`id_periodo` = `vp`.`id_periodo`)))) where (`vp`.`promedio` is not null) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-11-09 19:51:21