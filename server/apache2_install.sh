#!/bin/sh
CWD=$(pwd)

echo "installing useful packages"
echo "=========================="
apt-get update
apt-get -y install ssh
apt-get -y install zip unzip
apt-get -y install tar
apt-get -y install openssh-server
apt-get -y install build-essential
apt-get -y install python
apt-get -y install ipython
apt-get -y install python-dev
apt-get -y install postgresql
apt-get -y install apache2
apt-get -y install libapache2-mod-wsgi
apt-get -y install python2.5-psycopg2
apt-get -y install postfix
apt-get -y install wget
apt-get -y install python-matplotlib
apt-get -y install python-reportlab
apt-get -y install mercurial
/etc/init.d/postgresql restart

echo "downloading, installing and starting web2py"
echo "==========================================="
wget https://github.com/web2py/web2py/archive/R-2.9.5.zip 
unzip -d $(dirname $0) -n R-2.9.5.zip
cp -nR web2py-R-2.9.5/* web2py
mv web2py/handlers/wsgihandler.py web2py/wsgihandler.py
rm -rf web2py-R-2.9.5/
rm -f R-2.9.5.zip
chown -R www-data:www-data web2py

echo "setting up apache modules"
echo "========================="
a2enmod ssl
a2enmod proxy
a2enmod proxy_http
a2enmod headers
a2enmod expires
a2enmod wsgi
a2enmod rewrite  # for 14.04
mkdir /etc/apache2/ssl

echo "creating a self signed certificate"
echo "=================================="
openssl genrsa 1024 > /etc/apache2/ssl/self_signed.key
chmod 400 /etc/apache2/ssl/self_signed.key
openssl req -new -x509 -nodes -sha1 -days 365 -key /etc/apache2/ssl/self_signed.key > /etc/apache2/ssl/self_signed.cert
openssl x509 -noout -fingerprint -text < /etc/apache2/ssl/self_signed.cert > /etc/apache2/ssl/self_signed.info

echo "rewriting your apache config file to use mod_wsgi"
echo "================================================="
echo "
WSGIDaemonProcess web2py user=www-data group=www-data processes=1 threads=1

<VirtualHost *:80>

    DocumentRoot /var/www
    <Directory />
      Options FollowSymLinks
      AllowOverride None
    </Directory>

    <Directory /var/www/>
      Options Indexes FollowSymLinks MultiViews
      AllowOverride all
      Order allow,deny
      allow from all
    </Directory>

    ScriptAlias /cgi/ /usr/lib/cgi-bin/

    <Directory /usr/lib/cgi-bin/>
      Options Indexes FollowSymLinks
      Options +ExecCGI
      #AllowOverride None
      Require all granted
      AddHandler cgi-script cgi pl
    </Directory>

  <Directory /home/vidjil/server/../browser>
    AllowOverride None
  </Directory>

  CustomLog /var/log/apache2/access.log common
  ErrorLog /var/log/apache2/error.log
</VirtualHost>

<VirtualHost *:443>
  SSLEngine on
  SSLCertificateFile /etc/apache2/ssl/self_signed.cert
  SSLCertificateKeyFile /etc/apache2/ssl/self_signed.key

  WSGIProcessGroup web2py
  WSGIScriptAlias / $CWD/web2py/wsgihandler.py
  WSGIPassAuthorization On

  <Directory $CWD/web2py>
    AllowOverride None
    Require all denied
    <Files wsgihandler.py>
      Require all granted
    </Files>
  </Directory>

  <Directory $CWD/../browser>
    AllowOverride None
  </Directory>

  AliasMatch ^/([^/]+)/static/(?:_[\d]+.[\d]+.[\d]+/)?(.*) \\
        $CWD/web2py/applications/\$1/static/\$2

  <Directory $CWD/web2py/applications/*/static/>
    Options -Indexes
    ExpiresActive On
    ExpiresDefault \"access plus 1 hour\"
    Require all granted
  </Directory>

  CustomLog /var/log/apache2/ssl-access.log common
  ErrorLog /var/log/apache2/error.log
</VirtualHost>
" > /etc/apache2/sites-available/default.conf  # FOR 14.04

sudo rm /etc/apache2/sites-enabled/*    # FOR 14.04
sudo a2ensite default                   # FOR 14.04
sudo a2enmod cgi
sudo ln -s $CWD/../browser /var/www/browser
sudo ln -s $CWD/../browser/cgi/align.cgi /usr/lib/cgi-bin

echo "config browser"
echo "=============="
echo "
var config = {
    /*cgi*/
    \"cgi_address\" : \"default\",
    
    /*database */
    \"use_database\" : true,
    \"db_address\" : \"default\",
    
    \"debug_mode\" : false  
}
" > $CWD/../browser/js/conf.js 

echo "install simple worker"
echo "====================="

echo "
description \"web2py vidjil task scheduler\"
start on (local-filesystems and net-device-up IFACE=eth0)
stop on shutdown
respawn limit 8 60 # Give up if restart occurs 8 times in 60 seconds.
exec sudo -u www-data python $CWD/web2py/web2py.py -K vidjil
respawn" > /etc/init/web2py-scheduler.conf

echo "restarting apache"
echo "================"

/etc/init.d/apache2 restart
cd $CWD/web2py
sudo -u www-data python -c "from gluon.widget import console; console();"
sudo -u www-data python -c "from gluon.main import save_password; save_password(raw_input('admin password: '),443)"
echo "done!"
