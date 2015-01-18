/*

  Copyright © 2006..2013  Alex Tingle

*/

function resizeMap()
{
  var div =document.getElementById("map");
  var hgt =FLD.getWindowHeight() - FLD.findPosY(div) - 17;
  var footer =document.getElementById("footer");
  if(footer)
    hgt = hgt - footer.offsetHeight;
  if(hgt>=0)
  {
    div.style.height = hgt+"px";
    google.maps.event.trigger(FLD.map, 'resize');
  }
}

/** Work out which ad element to use, and place it on the map, unless
 *  it's an Adsense unit, in which case we leave it at the top to avoid
 *  displeasing Google. */
function placeAdElement()
{
  var onmap = false;
  var ad =document.getElementById('adunit');
  if(ad) // Adsense
  {
    if(FLD.adsenseBlocked()) // replace it with the donate button.
    {
      ad.innerHTML='';
      var donate =document.getElementById('donate');
      ad = donate;
      onmap = true;
    }
    else
    {
      // Add a strut to support the table height in "narrow" CSS mode.
      var strut = document.createElement('div');
      strut.className = 'narrow';
      strut.style.width = '0';
      strut.style.height = '' + ad.clientHeight + 'px';
      strut.innerHTML = '&nbsp;';
      ad.parentNode.appendChild(strut);
    }
  }
  else
  {
    ad = document.getElementById('partner');
    onmap = true;
  }
  if(onmap)
  {
    var adcontainer = document.createElement('div');
    adcontainer.style.margin = '7px';
    adcontainer.appendChild(ad);
    FLD.map.controls[google.maps.ControlPosition.TOP_CENTER].push(adcontainer);
  }
  ad.style.display='block';
}

function make_map()
{
    FLD.initialize( -2.4,54, 6 ); // UK
    // FLD.initialize( -74.38,39.44, 7 ); // Eastern USA
    // FLD.initialize( 136.66,35.92, 6 ); // Japan

    FLD.map=new google.maps.Map(document.getElementById("map"), FLD.mapOptions);

    placeAdElement();
    FLD.setSeaLevelRise(FLD.seaLevelRise,true);

    google.maps.event.addListener(FLD.map, 'maptypeid_changed', FLD.readWhichType);
    google.maps.event.addListener(FLD.map, 'dragend', FLD.setLink);
    google.maps.event.addListener(FLD.map, 'zoom_changed', FLD.setLink);

    setTimeout(resizeMap,0);
}

google.maps.event.addDomListener(window, 'load', make_map);