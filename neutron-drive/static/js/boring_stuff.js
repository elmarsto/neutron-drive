jQuery(document).ajaxSend(function(event, xhr, settings) {
    function getCookie(name) {
        var cookieValue = null;
        if (document.cookie && document.cookie != '') {
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
                var cookie = jQuery.trim(cookies[i]);
                // Does this cookie string begin with the name we want?
                if (cookie.substring(0, name.length + 1) == (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
    function sameOrigin(url) {
        // url could be relative or scheme relative or absolute
        var host = document.location.host; // host + port
        var protocol = document.location.protocol;
        var sr_origin = '//' + host;
        var origin = protocol + sr_origin;
        // Allow absolute or scheme relative URLs to same origin
        return (url == origin || url.slice(0, origin.length + 1) == origin + '/') ||
            (url == sr_origin || url.slice(0, sr_origin.length + 1) == sr_origin + '/') ||
            // or any other URL that isn't scheme relative or absolute i.e relative.
            !(/^(\/\/|http:|https:).*/.test(url));
    }
    function safeMethod(method) {
        return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
    }

    if (!safeMethod(settings.type) && sameOrigin(settings.url)) {
        xhr.setRequestHeader("X-CSRFToken", getCookie('GRASSHOPPER'));
    }
    
    try {
      _gaq.push(['_trackPageview', settings.url]);
    }
    
    catch (e) {
      console.log(e);
    }
});

var FILE_EXTS = {
  'clj': 'clojure',
  
  'c': 'c_cpp', 'cpp': 'c_cpp', 'h': 'c_cpp', 'hpp': 'c_cpp',
  
  'cfm': 'coldfusion', 'cfc': 'coldfusion', 'cfml': 'coldfusion',
  
  'cof': 'coffee', 'coffee': 'coffee',
  
  'cs': 'csharp',
  
  'css': 'css',
  
  'diff': 'diff',
  
  'go': 'golang',
  
  'hx': 'haxe',
  
  'htm': 'html', 'html': 'html',
  
  'java': 'java', 'class': 'java',
  
  'js': 'javascript',
  
  'json': 'json',
  
  'jsx': 'jsx',
  
  'tex': 'latex', 'latex': 'latex',
  
  'less': 'less',
  
  'liquid': 'liquid',
  
  'lua': 'lua',
  
  'md': 'markdown',
  
  'pgsql': 'pgsql',
  
  'php': 'php',
  
  'pl': 'perl', 'pm': 'perl',
  
  'ps1': 'powershell',
  
  'py': 'python',
  
  'rb': 'ruby', 'rbx': 'ruby',
  
  'sass': 'scss', 'scss': 'scss',
  
  'sh': 'sh',
  
  'sql': 'sql',
  
  'svg': 'svg',
  
  'txt': 'text', 'text': 'text', 'readme': 'text',
  
  'xml': 'xml', 'rss': 'xml', 'atom': 'xml',
  
  'xquery': 'xquery', 'xq': 'xquery',
  
  'yml': 'yaml', 'yaml': 'yaml',
  
  'groovy': 'groovy',
  
  'ml': 'ocaml', 'mli': 'ocaml', 'mll': 'ocaml',
  
  'scad': 'scad',
  
  'scala': 'scala', 
  
  'textile': 'textile',
  
  'dart': 'text',
  
  'glsl': 'glsl',
  
  'jade': 'jade',
  
  'jsp': 'jsp',
  
  'tcl': 'tcl',
  
  'lp': 'luapage'
};

var MIMES = [
  "text/css",
  "text/x-diff",
  "application/javascript",
  "application/x-latex",
  "text/x-tex",
  "image/svg+xml",
  "text/x-perl",
  "application/java-vm",
  "application/x-sql",
  "application/x-httpd-php",
  "text/x-sh",
  "application/xml",
  "application/x-ruby",
  "application/rss+xml",
  "application/atom+xml",
  "text/x-scala",
  "text/plain",
  "text/x-c++src",
  "application/json",
  "text/html",
  "text/x-csrc",
  "text/x-python",
  "text/x-java",
  "application/x-sql",
  "application/dart"
];

