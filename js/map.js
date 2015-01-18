/*

  Copyright © 2006..2013  Alex Tingle

*/

var FLD ={
  DEFAULT_SLR : 7,
  DEFAULT_TYPE : google.maps.MapTypeId.ROADMAP,
  SET_LINK_TEXT : true,
  OPACITY : 0.5,

  /** Used to translate old 't=' parameters into new mapTypeIds. */
  TYPE_DICT : [
      google.maps.MapTypeId.ROADMAP,
      google.maps.MapTypeId.SATELLITE,
      google.maps.MapTypeId.HYBRID,
      google.maps.MapTypeId.TERRAIN
    ],

  map : null,
  mapOptions : null,
  SCRIPT_NAME : document.URL.replace(/[?].*$/,''),
  SERVER_NAME : document.URL.replace(/^https?:[/][/]/,'').replace(/[/].*$/,''),
  tileBaseUrl : '/solidtile/',
  mapTypesArray : [], ///< An array of 'mapTypes'
  overlaysArray : [],
  seaLevelRise : 7,
  whichType : 0, ///< 0=map 1=sat

  metaDescription : null,
  
  /** Callback for user actions. */
  onchange : null,

  /** Read GET parameters and set up the environment. Call before FLD.map
   *  has been set.
   *  Initialises FLD.mapOptions & FLD.overlaysArray.
   *  Sets the initial lng,lat, zoom & slr (defaults provided by args).
   *  Returns the params object.
   */
  initialize : function(lng,lat,zoom)
    {
      // Initialise value.
      FLD.metaDescription = FLD.getFirstMeta('description');

      // Set default values, after ALL javascript has been loaded.
      // Allows for subsequent .js to change default values.
      FLD.seaLevelRise=FLD.DEFAULT_SLR;
      FLD.whichType=FLD.DEFAULT_TYPE;

      // Read GET params.
      var params=FLD.get_parameters();
      if(params)
      {
        if(params['ll'])
        {
          // Facebook mangle the ',' into %2C. Wankers.
          var yx=params['ll'].split(/,|%2[cC]/);
          if(yx.length==2)
          {
            lat=parseFloat(yx[0]);
            lng=parseFloat(yx[1]);
          }
        }
        if(params['m'])
          FLD.seaLevelRise=Math.abs(parseInt(params['m'],10));
        if(params['zoom'])
          zoom=Math.abs(parseInt(params['zoom'],10));
        if(params['type'])
          FLD.whichType = params['type'];

        // back compat params...
        if(params['z'])
          zoom = 17 - Math.abs(parseInt(params['z'],10));
        if(params['t'])
        {
          var t = Math.abs(parseInt(params['t'],10));
          if(0<=t && t<FLD.TYPE_DICT.length)
            FLD.whichType = FLD.TYPE_DICT[t];
        }
      }

      FLD.mapOptions = {
          zoom: zoom,
          maxZoom: 17,
          center: new google.maps.LatLng(lat, lng),
          mapTypeId: FLD.whichType,
          scaleControl: true,
          streetViewControl: false,
          zoomControl: true,
          noClear: true, // for copyright message.
        };

      // Make overlays for each sea level.
      var select=document.getElementById('m');
      if(select)
      {
        for(var j=0, jlen=select.options.length; j<jlen; ++j)
        {
          var slr = parseInt( select.options[j].value, 10 );
          FLD.overlaysArray.push( FLD.makeFloodTileLayer(slr) );
        }
      }
      else
      {
        // Just one slr.
        FLD.overlaysArray.push( FLD.makeFloodTileLayer(FLD.seaLevelRise) );
      }

      return params;
    },

  /** Construct a new ImageMapType with the given sea level rise. */
  makeFloodTileLayer : function(slr)
    {
      var imageMapTypeOptions = {
          getTileUrl: function(coord,zoom)
            {
              var sep = '/';
              var eq = '_';
              // Get normalised coordinates.
              var x = coord.x;
              var y = coord.y;
              var tileRange = 1 << zoom;
              if (y < 0 || y >= tileRange)
                return null;
              if (x < 0 || x >= tileRange)
                x = (x % tileRange + tileRange) % tileRange;
              return 'http://'+FLD.SERVER_NAME+FLD.tileBaseUrl
                +"m"+eq+slr+sep
                +"x"+eq+x+sep
                +"y"+eq+y+sep
                +"z"+eq+zoom;
            },
          tileSize: new google.maps.Size(256, 256),
          maxZoom: 17,
          name: slr + " m",
          opacity: FLD.OPACITY,
        };
      return new google.maps.ImageMapType(imageMapTypeOptions);
    },

  /** Looks at FLD.map and works out which map type it's set to.
   *  Sets FLD.whichType, and calls FLD.setLink() if it's changed. */
  readWhichType : function()
    {
      var mt = FLD.map.getMapTypeId();
      if(mt != FLD.whichType)
      {
        FLD.whichType = mt;
        FLD.setLink();
      }
    },

  /** Callback from HTML - called when the user changes SLR. */
  setSeaLevelRise : function(slr,init)
    {
      var select=document.getElementById('m');
      if(select)
      {
        // Find the nearest matching option (round down).
        var m, i=select.options.length;
        do{
            m = parseInt( select.options[ --i ].value, 10 );
        } while( m>slr && i );
        FLD.seaLevelRiseIdx = i;
        FLD.seaLevelRise = m;
        FLD.map.overlayMapTypes.setAt(0, FLD.overlaysArray[i]);
        select.selectedIndex = i;
        select.className = 'm'+m;
      }
      else
      {
        FLD.seaLevelRiseIdx = 0;
        FLD.seaLevelRise = slr;
        FLD.map.overlayMapTypes.setAt(0, FLD.overlaysArray[0]);
      }
      FLD.setLink();
    },

  /** Callback from various places - called when something changes.
   *  Sets the value of #link. */
  setLink : function()
    {
      // Call user callback.
      if(FLD.onchange)
        FLD.onchange();
      // Calculate the link URL.
      var center =FLD.map.getCenter();
      var fldUrl =FLD.SCRIPT_NAME+'?ll='+center.lat().toFixed(4)+','+
                                         center.lng().toFixed(4);
      if(FLD.map.getZoom()!=6)
        fldUrl += '&zoom='+FLD.map.getZoom();
      if(FLD.seaLevelRise!=FLD.DEFAULT_SLR)
        fldUrl += '&m='+FLD.seaLevelRise;
      if(FLD.whichType!=FLD.DEFAULT_TYPE)
        fldUrl += '&type='+FLD.whichType;
      // Update the #link element
      var link =document.getElementById('link');
      if(link)
      {
        link.href = fldUrl;
        if(FLD.SET_LINK_TEXT)
        {
          link.innerHTML=link.href;
          FLD.flash(link);
        }
      }
      // Update social media links.
      FLD.setHrefById('link-facebook', FLD.makeFacebookUrl(fldUrl));
      FLD.setHrefById('link-twitter',  FLD.makeTwitterUrl(fldUrl));
      FLD.setHrefById('link-reddit',   FLD.makeRedditUrl(fldUrl));
    },

  makeFacebookUrl : function(fldUrl)
    {
      var dict = {
        app_id:       481232061943957,
        link:         fldUrl,
        name:         '' + FLD.seaLevelRise +'m sea level rise',
        caption:      document.title,
        description:  FLD.metaDescription,
        redirect_uri: 'http://www.facebook.com',
        picture:      FLD.getThumbUrl(),
      };
      return 'https://www.facebook.com/dialog/feed?' + FLD.params2str(dict);
    },

  makeTwitterUrl : function(fldUrl)
    {
      var dict = {
        hashtags: 'floodmap',
        text:     '' + FLD.seaLevelRise +'m sea level rise.',
        url:      fldUrl,
      };
      return 'http://twitter.com/share?' + FLD.params2str(dict);
    },

  makeRedditUrl : function(fldUrl)
    {
      var dict = {
        url:      fldUrl,
      };
      return 'http://www.reddit.com/submit?' + FLD.params2str(dict);
    },

  getThumbUrl : function()
    {
      var center =FLD.map.getCenter();
      return 'http://flood.firetree.net/thumb'+
          '/ll_'+center.lat().toFixed(4)+','+
                 center.lng().toFixed(4)+
          '/m_'+FLD.seaLevelRise+
          '/zoom_'+FLD.map.getZoom()+
          '/type_'+FLD.whichType;
    },

  setHrefById: function(id, url)
    {
      var a = document.getElementById(id);
      if(a)
          a.href = url;
    },

  //
  //  UTILS
  //

  /** Generate a params object from the current URL's GET parameters. */
  get_parameters : function()
    {
      var url = window.location.href;
      var paramsStart = url.indexOf("?");

      if(paramsStart != -1)
      {
        var paramString = url.substr(paramsStart + 1);
        var params = paramString.split("&");
        for(var i=0, len=params.length; i<len; ++i)
        {
          var pairArray = params[i].split("=");
          if(pairArray.length == 2)
              params[pairArray[0]] = pairArray[1];
        }
        return params;
      }
      return null;
    },

  /** Return the content of the first meta whose name matches the parameter. */
  getFirstMeta : function(metaName)
    {
      var head = document.getElementsByTagName('head')[0];
      var metas = head.getElementsByTagName('meta');
      for(var i=0, len=metas.length; i<len; i++)
          if(metas[i].name == metaName)
              return metas[i].content;
      return null;
    },

  /** Convert a dictionary object into a GET parameter string. */
  params2str: function(dict)
    {
      var result = '';
      for(var key in dict)
      {
        if(result.length>0)
            result += '&';
        result += key + '=' + encodeURIComponent('' + dict[key]);
      }
      return result;
    },

  /** If params[key] is set, then return its 'truthiness',
   *  otherwise return dflt. */
  isSet : function(params,key,dflt)
    {
      if( params && params.hasOwnProperty(key) )
      {
        var v =params[key];
        return !( v==='0' || v==='off' || v===0 || v===false );
      }
      return dflt;
    },

  /** Briefly flash an element. */
  flash : function(e,col)
    {
      col = col? col: 'FFD700';
      if(e.fld_flash_tid)
      {
        clearTimeout(e.fld_flash_tid);
        e.fld_flash_tid=0;
      }
      var STEPS=10;
      var R =parseInt(col.substr(0,2),16);
      var G =parseInt(col.substr(2,2),16);
      var B =parseInt(col.substr(4,2),16);
      var r = (255-R)/STEPS;
      var g = (255-G)/STEPS;
      var b = (255-B)/STEPS;
      var i = 0;
      function hex(n,len)
        {
          len=len?len:2;
          var result=(Math.floor(n)).toString(16);
          while(result.length<len)
            result='0'+result;
          return result;
        }
      function next()
        {
          if(i>=STEPS)
          {
            e.style.backgroundColor='#fff';
            e.fld_flash_tid=0;
            return;
          }
          var rgb = '#' + hex(R+i*r) + hex(G+i*g) + hex(B+i*b);
          e.style.backgroundColor=rgb;
          i++;
          e.fld_flash_tid=setTimeout(next,150);
        }
      next();
    },

  /** Returns TRUE if the adsense ad-unit has been blocked. */
  adsenseBlocked : function()
    {
      var div=document.getElementById('adunit');
      var iframes=div.getElementsByTagName('iframe');
      if(!iframes || 0==iframes.length)
        return true;
      for(var i=0, len=iframes.length; i<len; i++)
      {
        var e=iframes[i];
        if((e.src.indexOf('googlesyndication.com') > -1) &&
           (e.setAttribute && (e.style.visibility=='hidden' ||
            e.style.display=='none')))
        {
          return true;
        }
      }
      return false;
    },

  /** Calculate the absolute y-coordinate of obj. */
  findPosY : function(obj)
    {
      var curtop = 0;
      if(obj.offsetParent)
          while(1)
          {
            curtop += obj.offsetTop;
            if(!obj.offsetParent)
              break;
            obj = obj.offsetParent;
          }
      else if(obj.y)
          curtop += obj.y;
      return curtop;
    },

  getWindowWidth : function()
    {
      if(window.self && self.innerWidth)
         return self.innerWidth;
      if(document.documentElement && document.documentElement.clientWidth)
         return document.documentElement.clientWidth;
      return 0;
    },

  getWindowHeight : function()
    {
      if(window.self && self.innerHeight)
         return self.innerHeight;
      if(document.documentElement && document.documentElement.clientHeight)
         return document.documentElement.clientHeight;
      return 0;
    },

}; // end FLD