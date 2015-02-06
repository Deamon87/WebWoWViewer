<%--
  Created by IntelliJ IDEA.
  User: Deamon
  Date: 17/01/2015
  Time: 11:10
  To change this template use File | Settings | File Templates.
--%>
<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<html>
    <head>
        <title></title>

        <script type="text/javascript" src="${pageContext.request.contextPath}/html/js/lib/bower/jquery/dist/jquery.js"></script>
        <script type="text/javascript" src="${pageContext.request.contextPath}/html/js/lib/bower/angular/angular.js"></script>
        <script type="text/javascript" src="${pageContext.request.contextPath}/html/js/lib/bower/scenejs/api/latest/scenejs.js"></script>

        <script type="text/javascript" src="${pageContext.request.contextPath}/html/js/lib/bower/text-encoding/lib/encoding-indexes.js"></script>
        <script type="text/javascript" src="${pageContext.request.contextPath}/html/js/lib/bower/text-encoding/lib/encoding.js"></script>

        <script type="text/javascript" src="${pageContext.request.contextPath}/html/js/application/angular/services/config.js"></script>
        <script type="text/javascript" src="${pageContext.request.contextPath}/html/js/application/angular/services/fileReadHelper.js"></script>
        <script type="text/javascript" src="${pageContext.request.contextPath}/html/js/application/angular/services/dbcLoader.js"></script>

        <script type="text/javascript" src="${pageContext.request.contextPath}/html/js/application/angular/services/chunkedLoader.js"></script>
        <script type="text/javascript" src="${pageContext.request.contextPath}/html/js/application/angular/services/linedfileLoader.js"></script>

        <script type="text/javascript" src="${pageContext.request.contextPath}/html/js/application/angular/services/map/wdtLoader.js"></script>
        <script type="text/javascript" src="${pageContext.request.contextPath}/html/js/application/angular/services/map/wmoLoader.js"></script>
        <script type="text/javascript" src="${pageContext.request.contextPath}/html/js/application/angular/services/map/mdxLoader.js"></script>
        <script type="text/javascript" src="${pageContext.request.contextPath}/html/js/application/angular/services/dbc/mapDBC.js"></script>

        <!-- SceneJS custom loaders -->
        <script type="text/javascript" src="${pageContext.request.contextPath}/html/js/application/angular/sceneJs/loaders/wmoImporter.js"></script>


        <script type="text/javascript" src="${pageContext.request.contextPath}/html/js/application/angular/services/wowSceneJsService.js"></script>

        <script type="text/javascript" src="${pageContext.request.contextPath}/html/js/application/angular/directives/sceneJsElem.js"></script>


        <script type="text/javascript" src="${pageContext.request.contextPath}/html/js/application/angular/app.js"></script>
    </head>
    <body ng-app="main.app">

    <scene-js-elem data-id="testId"></scene-js-elem>


  </body>
</html>
