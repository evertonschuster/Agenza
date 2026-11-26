using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using OpenIddict.Server;

namespace IdentityService.Api.Setup;

public static class OpenIddictCertificateExtensions
{
    private const string SectionName = "Identity:Certificates";

    public static OpenIddictServerBuilder AddConfiguredCertificates(
        this OpenIddictServerBuilder options,
        IConfiguration configuration,
        TimeProvider timeProvider)
    {
        var now = timeProvider.GetUtcNow();

        var signing = Load(configuration, "Signing", now, X509KeyUsageFlags.DigitalSignature);
        var encryption = Load(
            configuration,
            "Encryption",
            now,
            X509KeyUsageFlags.KeyEncipherment);

        if (signing.Thumbprint == encryption.Thumbprint)
        {
            throw new InvalidOperationException(
                $"'{SectionName}:Signing' and '{SectionName}:Encryption' must be different certificates.");
        }

        return options
            .AddSigningCertificate(signing)
            .AddEncryptionCertificate(encryption);
    }

    // Only the key-usage flags that OpenIddict needs are checked: an absent extension means "any usage".
    private static X509Certificate2 Load(
        IConfiguration configuration,
        string purpose,
        DateTimeOffset now,
        X509KeyUsageFlags acceptedUsages)
    {
        var section = $"{SectionName}:{purpose}";
        var path = configuration[$"{section}:Path"];
        var password = configuration[$"{section}:Password"];

        if (string.IsNullOrWhiteSpace(path))
        {
            throw new InvalidOperationException($"Missing '{section}:Path' configuration.");
        }

        if (string.IsNullOrEmpty(password))
        {
            throw new InvalidOperationException($"Missing '{section}:Password' configuration.");
        }

        if (!File.Exists(path))
        {
            throw new InvalidOperationException($"The certificate file configured in '{section}:Path' was not found.");
        }

        X509Certificate2 certificate;
        try
        {
            certificate = X509CertificateLoader.LoadPkcs12FromFile(path, password, X509KeyStorageFlags.EphemeralKeySet);
        }
        catch (CryptographicException exception)
        {
            throw new InvalidOperationException(
                $"The certificate in '{section}:Path' could not be loaded: wrong password or not a valid PFX file.",
                exception);
        }

        if (!certificate.HasPrivateKey || certificate.GetRSAPrivateKey() is null)
        {
            throw new InvalidOperationException($"The certificate in '{section}:Path' must contain an RSA private key.");
        }

        if (now < certificate.NotBefore.ToUniversalTime() || now > certificate.NotAfter.ToUniversalTime())
        {
            throw new InvalidOperationException(
                $"The certificate in '{section}:Path' is outside its validity period " +
                $"({certificate.NotBefore:O} to {certificate.NotAfter:O}).");
        }

        var keyUsage = certificate.Extensions.OfType<X509KeyUsageExtension>().FirstOrDefault();
        if (keyUsage is not null && (keyUsage.KeyUsages & acceptedUsages) == 0)
        {
            throw new InvalidOperationException(
                $"The certificate in '{section}:Path' does not allow the key usage required for {purpose.ToLowerInvariant()}.");
        }

        return certificate;
    }
}
