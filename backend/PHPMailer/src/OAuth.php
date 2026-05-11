<?php

/**
 * PHPMailer - PHP email creation and transport class.
 * PHP Version 5.5.
 *
 * @see       https://github.com/PHPMailer/PHPMailer/ The PHPMailer GitHub project
 *
 * @author    Marcus Bointon (Synchro/coolbru) <phpmailer@synchromedia.co.uk>
 * @author    Jim Jagielski (jimjag) <jimjag@gmail.com>
 * @author    Andy Prevost (codeworxtech) <codeworxtech@users.sourceforge.net>
 * @author    Brent R. Matzelle (original founder)
 * @copyright 2012 - 2020 Marcus Bointon
 * @copyright 2010 - 2012 Jim Jagielski
 * @copyright 2004 - 2009 Andy Prevost
 * @license   https://www.gnu.org/licenses/old-licenses/lgpl-2.1.html GNU Lesser General Public License
 * @note      This program is distributed in the hope that it will be useful - WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.
 */

namespace PHPMailer\PHPMailer;

/**
 * OAuth - OAuth2 authentication wrapper class.
 * Uses the oauth2-client package from the League of Extraordinary Packages.
 *
 * Note: This class requires league/oauth2-client package to be installed.
 * Install with: composer require league/oauth2-client
 *
 * @see     https://oauth2-client.thephpleague.com
 *
 * @author  Marcus Bointon (Synchro/coolbru) <phpmailer@synchromedia.co.uk>
 */
class OAuth implements OAuthTokenProvider
{
    /** @var bool|null Whether OAuth2 client is installed */
    private static $oauth2ClientInstalled = null;

    /** @var object|null Provider instance */
    protected $provider;

    /** @var object|null OAuth token */
    protected $oauthToken;

    /** @var string User email */
    protected $oauthUserEmail = '';

    /** @var string Client secret */
    protected $oauthClientSecret = '';

    /** @var string Client ID */
    protected $oauthClientId = '';

    /** @var string Refresh token */
    protected $oauthRefreshToken = '';

    /**
     * Check if league/oauth2-client is installed
     * @return bool
     */
    private static function isOAuth2ClientInstalled() {
        if (self::$oauth2ClientInstalled === null) {
            self::$oauth2ClientInstalled = class_exists('League\OAuth2\Client\Grant\RefreshToken');
        }
        return self::$oauth2ClientInstalled;
    }

    /**
     * OAuth constructor.
     * @param array $options Associative array containing provider, userName, clientSecret, clientId and refreshToken
     */
    public function __construct($options)
    {
        $this->provider = $options['provider'] ?? null;
        $this->oauthUserEmail = $options['userName'] ?? '';
        $this->oauthClientSecret = $options['clientSecret'] ?? '';
        $this->oauthClientId = $options['clientId'] ?? '';
        $this->oauthRefreshToken = $options['refreshToken'] ?? '';
    }

    /**
     * Get a new RefreshToken grant
     * @throws \Exception if OAuth2 client not installed
     * @return object RefreshToken instance
     */
    protected function getGrant()
    {
        if (!self::isOAuth2ClientInstalled()) {
            throw new \Exception('league/oauth2-client package not installed. Install with: composer require league/oauth2-client');
        }
        $class = 'League\OAuth2\Client\Grant\RefreshToken';
        return new $class();
    }

    /**
     * Get a new AccessToken
     * @throws \Exception if OAuth2 client not installed
     * @return object AccessToken instance
     */
    protected function getToken()
    {
        if (!self::isOAuth2ClientInstalled()) {
            throw new \Exception('OAuth functionality requires league/oauth2-client package. Install with: composer require league/oauth2-client');
        }
        return $this->provider->getAccessToken(
            $this->getGrant(),
            ['refresh_token' => $this->oauthRefreshToken]
        );
    }

    /**
     * Generate a base64-encoded OAuth token
     * @throws \Exception if OAuth2 client not installed
     * @return string Base64 encoded OAuth token
     */
    public function getOauth64()
    {
        if (!self::isOAuth2ClientInstalled()) {
            throw new \Exception('OAuth not available. league/oauth2-client package is not installed. Install with: composer require league/oauth2-client');
        }

        if (null === $this->oauthToken || $this->oauthToken->hasExpired()) {
            $this->oauthToken = $this->getToken();
        }

        return base64_encode(
            'user=' . $this->oauthUserEmail .
            "\001auth=Bearer " . $this->oauthToken .
            "\001\001"
        );
    }
}