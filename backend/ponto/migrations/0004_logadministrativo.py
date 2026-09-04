import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("ponto", "0003_marcacaoponto_dispositivo_id_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="LogAdministrativo",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("acao", models.CharField(max_length=80)),
                ("alvo_tipo", models.CharField(max_length=80)),
                ("alvo_id", models.CharField(blank=True, max_length=100)),
                ("detalhes", models.JSONField(blank=True, default=dict)),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("ator", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="logs_administrativos", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "logs_administrativos", "ordering": ["-criado_em"]},
        ),
    ]
