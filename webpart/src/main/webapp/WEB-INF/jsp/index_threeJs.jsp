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

        <script type="text/javascript" src="${pageContext.request.contextPath}/html/js/lib/bower/threejs/build/three.js"></script>
        <script type="text/javascript" src="${pageContext.request.contextPath}/html/js/lib/bower/stats.js/build/stats.min.js"></script>

        <script type="text/javascript" src="${pageContext.request.contextPath}/html/js/application/threejs/FlyControls.js"></script>

        <script type="text/javascript" src="${pageContext.request.contextPath}/html/js/lib/bower/text-encoding/lib/encoding-indexes.js"></script>
        <script type="text/javascript" src="${pageContext.request.contextPath}/html/js/lib/bower/text-encoding/lib/encoding.js"></script>

        <script type="text/javascript" src="${pageContext.request.contextPath}/html/js/application/angular/services/config.js"></script>

        <!-- Helpers for parsers -->
        <script type="text/javascript" src="${pageContext.request.contextPath}/html/js/application/angular/services/fileReadHelper.js"></script>
        <script type="text/javascript" src="${pageContext.request.contextPath}/html/js/application/angular/services/chunkedLoader.js"></script>
        <script type="text/javascript" src="${pageContext.request.contextPath}/html/js/application/angular/services/linedfileLoader.js"></script>

        <!-- Parsers for files -->
        <script type="text/javascript" src="${pageContext.request.contextPath}/html/js/application/angular/services/dbcLoader.js"></script>

        <script type="text/javascript" src="${pageContext.request.contextPath}/html/js/application/angular/services/map/adtLoader.js"></script>
        <script type="text/javascript" src="${pageContext.request.contextPath}/html/js/application/angular/services/map/wdtLoader.js"></script>
        <script type="text/javascript" src="${pageContext.request.contextPath}/html/js/application/angular/services/map/blpLoader.js"></script>
        <script type="text/javascript" src="${pageContext.request.contextPath}/html/js/application/angular/services/map/wmoLoader.js"></script>
        <script type="text/javascript" src="${pageContext.request.contextPath}/html/js/application/angular/services/map/mdxLoader.js"></script>
        <script type="text/javascript" src="${pageContext.request.contextPath}/html/js/application/angular/services/map/skinLoader.js"></script>

        <script type="text/javascript" src="${pageContext.request.contextPath}/html/js/application/angular/services/dbc/mapDBC.js"></script>

                <script type="text/javascript" src="${pageContext.request.contextPath}/html/js/application/angular/directives/threeJsElem.js"></script>
                <script type="text/javascript" src="${pageContext.request.contextPath}/html/js/application/angular/threejs/wmoThreejsLoader.js"></script>

        <script type="text/javascript" src="${pageContext.request.contextPath}/html/js/application/angular/app_threejs.js"></script>
    </head>
    <body ng-app="main.app">

    <three-js-elem></three-js-elem>


  </body>
</html>
