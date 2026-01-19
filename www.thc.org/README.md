# www.thc.org

The first version of this project that I knew of was created and maintained by Lou-Cipher for The Hacker's Choice domains.

![The Hacker's Choice Website](./thc-DOT-org-SLASH-mail.png)

* https://github.com/Lou-Cipher
* https://www.thc.org/mail/
* https://github.com/hackerschoice/mail

---

The Hacker's Choice discontinued the service a while ago:
![Hackerschoice Free Mail Forwarding Shutdown](image.png)

I created this directory to keep the original Perl code that created by Lou.

Source code (Also available on `./register.pl`.):

```perl
#!/usr/bin/perl
#
# Version 0.02 early alpha ;)
# writes dynamic email forwarders into an postfix/dovecot database 
# author: LouCipher <lou at segfault dot org>
#

use strict;
use warnings;
use CGI;
use DBI;
use utf8;
use Mail::CheckUser qw(check_email last_check);
use Email::Address;

binmode STDOUT, ':encoding(UTF-8)';

my $sqlhost= '';
my $sqluser= '';
my $sqlpass= '';
my $sqldb=   '';
my $q = new CGI;
my $alias = "foo";
my $address = Email::Address->new(undef, $q->param('to'));
my $origin = $address->format;
my $originhost = $address->host;
my $domain = '';
my $fullalias = $alias . $domain;
my $reason = '';
my @mydomains = ('');

$Mail::CheckUser::Treat_Timeout_As_Fail = 1;
$Mail::CheckUser::Treat_Full_As_Fail = 1;
$Mail::CheckUser::Sender_Addr = $origin;

unless (
  $alias =~ /^[a-zA-Z0-9\-\._]+$/ and
  $origin !~ /['"\t]/
) {
  print $q->header( -status => '400 Bad Request' );
  print $q->start_html("Free Mail Forwarding Service");
  print $q->p("911 ERROR!");
  print $q->p("Hocus Pocus, doublecheck $alias or $origin");
  print $q->p("Join us on https://t.me/thcorg");
  print $q->end_html;
  exit;
}

if ( grep( /^$originhost$/, @mydomains ) ) {
  print $q->header( -status => '400 Bad Request' );
  print $q->start_html("Free Mail Forwarding Service");
  print $q->p("911 ERROR!");
  print $q->p("Ur a proper lout! $originhost loops back to myself");
  print $q->p("Join us on https://t.me/thcorg");
  print $q->end_html;
  exit;
}

if(check_email($origin)) {
  my $error = 'false' # will use this in a later relase
} else {
  $reason = last_check()->{reason};
  print $q->header( -status => '400 Bad Request' );
  print $q->start_html("Free Mail Forwarding Service");
  print $q->p("911 ERROR!");
  print $q->p("Bibbidi Bobbidi Boo, Bitch! E-mail address <$origin> isn't valid: $reason");
  print $q->p("Join us on https://t.me/thcorg");
  print $q->end_html;
  exit;
}


my $dbh = DBI->connect("DBI:mysql:database=$sqldb;host=$sqlhost", "$sqluser", "$sqlpass", {'RaiseError' => 1, 'mysql_enable_utf8' => 1});
my $db_update = $dbh->prepare('INSERT into alias (id, address, goto, active, created, modified, Domain_id) VALUES (NULL, ?, ? ,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,1);');
eval {
  $db_update->execute($fullalias, $origin);
};
if ($@) {
  warn 'SQL Error: ' . $@;
  print $q->header( -status => '500 Internal Server Error' );
  print $q->start_html("Free Mail Forwarding Service");
  print $q->p("911 ERROR!");
  print $q->p("Mess With the Best, Die Like the Rest, there's something fishy going on!");
  print $q->p("Join us on https://t.me/thcorg");
  print $q->end_html;
  $dbh->disconnect;
  exit;
}

$dbh->disconnect;

print $q->header( -status => '200 OK' );
print $q->start_html("Free Mail Forwarding Service");
print $q->p("By the power of Grayskull!");
print $q->p("$fullalias forwards now to $origin and can be used!");
print $q->p("Join us on https://t.me/thcorg");
print $q->end_html;

```